# portal-blog-contentful-migration
Node.js scripts to migrate Europeana blog from Wordpress SQL to Contentful


## Installation

Run:
```
npm install
```

## Configuration

Copy .env.example to .env and set environment variables for Contentful and
MySQL.

## Usage

For an overview of the available CLI commands, run:
```
npm run blog help
```

### Authors

To migrate blog post authors to `person` entries in Contentful, run:
```
npm run blog authors
```

### Posts

To create the blog post content entries in Contentful from the Wordpress SQL,
run:
```
npm run blog posts
```

To create just one entry for just one SQL row, add its primary key (ID):
```
npm run blog posts [ID]
```

### Clean

To delete the blog post entries from Contentful, and any linked entries, run:
```
npm run blog clean
```

This defaults to cleaning the `blogPosting` content type, but any other content
type may be wiped from Contentful by adding its ID as a further argument:
```
npm run blog clean [CONTENT_TYPE]
```

## License

Licensed under the EUPL v1.2.

For full details, see [LICENSE.md](LICENSE.md).
