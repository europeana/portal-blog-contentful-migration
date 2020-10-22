const { mysqlClient } = require('../support/config');
const { pad } = require('../support/utils');
const { hashedSysId } = require('../support/utils');
const { accessibleGuid } = require('./attachments');
const { assetUrl } = require('./assets');

const beautifyHtml = require('js-beautify').html;
const cheerio = require('cheerio');

const help = () => {
  pad.log('Usage: npm run blog body <ID>');
};

// TODO: split by <img> tags having blog.europeana.eu src attribute, taking
//       caption from title attribute, to make into image w/ attribution
const postElements = (post) => {
  const wpElementPattern = /^<!-- wp:([^ ]+)( ({[^}]*}))? (\/)?-->/;
  const lines = beautifyHtml(post.post_content).split('\n');

  const elements = [];

  while (lines.length > 0) {
    const line = lines.shift();
    const wpElement = line.match(wpElementPattern);
    if (wpElement) {
      const elementType = wpElement[1];
      const elementOptions = wpElement[3] ? JSON.parse(wpElement[3]) : null;
      let elementClosed = !!wpElement[4];
      const elementContent = [];

      while (lines.length > 0 && !elementClosed) {
        const nextLine = lines.shift();
        if (nextLine === `<!-- /wp:${elementType} -->`) {
          elementClosed = true;
        } else {
          elementContent.push(nextLine);
        }
      }

      elements.push({
        type: elementType,
        options: elementOptions,
        content: elementContent.join('\n')
      });
    } else if (line !== '') {
      const elementContent = [line];
      let nextLineIsWpElement = false;
      while (lines.length > 0 && !nextLineIsWpElement) {
        if (lines[0].match(wpElementPattern)) {
          nextLineIsWpElement = true;
        } else {
          elementContent.push(lines.shift());
        }
      }

      elements.push({
        type: 'html',
        content: elementContent.join('\n')
      });
    }
  }

  return elements;
};

const reduceElements = async(elements) => {
  const reduced = [];
  const typesToCombine = ['paragraph', 'html', 'separator'];
  while (elements.length > 0) {
    const element = elements.shift();
    if (element.type === 'image') {
      const imageHtml = cheerio.load(element.content);
      let url = imageHtml('img').attr('src');
      // Remove scaling suffix from image URL, e.g. -517x800, to use original size
      url = url.replace(/-[0-9]+x[0-9]+(\.[^.]+)$/, '$1');

      reduced.push({
        type: 'image',
        url,
        link: imageHtml('a').attr('href'),
        text: imageHtml('figcaption').text()
      });
    } else if (typesToCombine.includes(element.type)) {
      const combined = {
        type: 'html',
        content: element.content
      };
      let nextElementMayBeCombined = true;
      while (elements.length > 0 && nextElementMayBeCombined) {
        if (typesToCombine.includes(elements[0].type)) {
          combined.content = [combined.content, elements.shift().content].join('\n');
        } else {
          nextElementMayBeCombined = false;
        }
      }
      combined.content = await linkAttributesToContentful(combined.content);
      if (combined.content !== '') reduced.push(combined);
    } else {
      // TODO: handle "block" type
    }
  }
  return reduced;
};

const linkAttributesToContentful = async(html) => {
  const linkMatches = html.matchAll(/"(https?:\/\/blog\.europeana\.eu(:81)?([^"]*))"/g);

  for (const linkMatch of linkMatches) {
    const url = linkMatch[1];
    const path = linkMatch[3];

    let replacement;

    const postPathMatch = path.match(/^\/[0-9]{4}\/[0-9]{2}\/([^/]+)/);
    if (postPathMatch) {
      replacement = '/blog/' + postPathMatch[1];
    } else {
      const uploadPathMatch = path.match(/^\/wp-content\/uploads\//);
      if (uploadPathMatch) {
        replacement = await assetUrl(hashedSysId(accessibleGuid(url)));
      }
    }

    if (replacement) {
      html = html.replace(url, replacement);
    }
  }

  return html;
};

const loadBody = async(postOrId) => {
  let post;
  if (typeof postOrId === 'object') {
    post = postOrId;
  } else {
    const result = await mysqlClient.connection.execute(`
      SELECT * FROM wp_posts WHERE post_type='post' AND ID=?
    `, [postOrId]);
    post = result[0][0];
  }
  const elements = postElements(post);
  const reduced = reduceElements(elements);

  return reduced;
};

const cli = async(args) => {
  await mysqlClient.connect();

  const id = args[0];

  const post = await loadBody(id);
  pad.log(JSON.stringify(post, null, 2));

  await mysqlClient.connection.end();
};

module.exports = {
  cli,
  loadBody,
  help
};
