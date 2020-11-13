const { mysqlClient } = require('../support/config');
const { pad } = require('../support/utils');
const { hashedSysId } = require('../support/utils');
const { accessibleGuid } = require('./attachments');
const { assetUrl } = require('./assets');
const { ImageWithAttributionEntry } = require('../models');

const beautifyHtml = require('js-beautify').html;
const cheerio = require('cheerio');

const help = () => {
  pad.log('Usage: npm run blog body <ID>');
};

// TODO: split by <img> tags having blog.europeana.eu src attribute, taking
//       caption from title attribute, to make into image w/ attribution
const postElements = async(post) => {
  const lines = beautifyHtml(post.post_content).split('\n');

  const wpElementPattern = /^<!-- wp:([^ ]+)( ({[^}]*}))? (\/)?-->/;
  const wpCaptionPattern = /^\[caption[^\]]*](.*)\[\/caption]/;

  const elements = [];

  while (lines.length > 0) {
    const line = lines.shift();

    const wpElement = line.match(wpElementPattern);
    const wpCaption = line.match(wpCaptionPattern);

    if (wpElement) {
      const elementType = wpElement[1];
      let elementClosed = !!wpElement[4];
      let elementContent = '';

      while (lines.length > 0 && !elementClosed) {
        const nextLine = lines.shift();
        if (nextLine === `<!-- /wp:${elementType} -->`) {
          elementClosed = true;
        } else {
          elementContent = `${elementContent}\n${nextLine}`;
        }
      }

      elements.push(elementType === 'image' ? await elementForImage(elementContent) : {
        type: elementType,
        content: elementContent
      });
    } else if (wpCaption) {
      elements.push(await elementForImage(wpCaption[1]));
    } else if (line !== '') {
      const elementContent = [line];
      let nextLineStops = false;
      while (lines.length > 0 && !nextLineStops) {
        if (lines[0].match(wpElementPattern) || lines[0].match(wpCaptionPattern)) {
          nextLineStops = true;
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

const convertIframesToEmbeds = (elements) => {
  const iframePattern = /(<iframe [^>]*?><\/iframe>)/ig;
  const converted = [];
  for (const element of elements) {
    if (element.type === 'html') {
      const elementContentSplitByIframes = element.content.split(iframePattern);
      for (const part of elementContentSplitByIframes) {
        if (iframePattern.test(part)) {
          converted.push({
            type: 'embed',
            content: part
          });
        } else {
          converted.push({
            type: 'html',
            content: part
          });
        }
      }
    } else {
      converted.push(element);
    }
  }
  return converted;
};

const elementForImage = async(content) => {
  const cheerioDoc = cheerio.load(content);
  const text = cheerioDoc.root().text();

  let url = cheerioDoc('img').attr('src');
  // Remove scaling suffix from image URL, e.g. -517x800, to use original size
  url = url.replace(/-[0-9]+x[0-9]+(\.[^.]+)$/, '$1');

  const withAttribution = await ImageWithAttributionEntry.fromCaption(text, url);
  if (withAttribution) {
    return {
      type: 'image',
      url,
      link: cheerioDoc('a').attr('href'),
      text
    };
  } else {
    return {
      type: 'html',
      content
    };
  }
};

const reduceElements = async(elements) => {
  const reduced = [];
  const typesToCombine = ['paragraph', 'html', 'separator', 'list', 'heading', 'file', 'shortcode'];
  while (elements.length > 0) {
    const element = elements.shift();
    if (element.type === 'image') {
      reduced.push(element);
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

      if (combined.content !== '') {
        combined.content = await linkAttributesToContentful(combined.content);
        reduced.push(combined);
      }
    } else {
      // TODO: handle "block" type
      pad.increase();
      pad.log(`[WARN] unsupported element type "${element.type}"`);
      pad.decrease();
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

const loadBody = async(postId) => {
  const result = await mysqlClient.connection.execute(`
    SELECT * FROM wp_posts WHERE post_type='post' AND ID=?
  `, [postId]);
  const post = result[0][0];

  const elements = await postElements(post);
  const reduced = await reduceElements(elements);
  const converted = await convertIframesToEmbeds(reduced);

  return converted;
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
