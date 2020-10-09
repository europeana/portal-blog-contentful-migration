const { mysqlClient } = require('../support/config');
const { pad } = require('../support/utils');
const { accessibleGuid, assetIdForAttachmentPost } = require('./attachments');

const cheerio = require('cheerio');

const help = () => {
  pad.log('Usage: npm run blog body <ID>');
};

const postElements = (post) => {
  const wpElementPattern = /^<!-- wp:([^ ]+)( ({[^}]*}))? (\/)?-->/;
  const lines = post.post_content.split('\n');

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
      const elementContent = [];
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

const reduceElements = (elements) => {
  const reduced = [];
  const typesToCombine = ['paragraph', 'html', 'separator'];
  while (elements.length > 0) {
    const element = elements.shift();
    if (element.type === 'image') {
      const imageHtml = cheerio.load(element.content);
      element.url = accessibleGuid(imageHtml('img').attr('src'));
      element.assetId = assetIdForAttachmentPost(element.url);
      element.link = imageHtml('a').attr('href');
      element.text = imageHtml('figcaption').text();
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
      reduced.push(combined);
    } else {
      // TODO: handle "block" type
    }
  }
  return reduced;
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
