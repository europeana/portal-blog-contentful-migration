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

### Attachments

To migrate just the media attachments from Wordpress into Contentful as assets,
run:
```
npm run blog attachments
```

The sys ID of the asset will be derived from the MD5 hash of the URL of the
attachment, and only be stored if it does not already exist, so can be stopped
and resumed without starting over.

### Assets

To write a cache of the available asset IDs in the Contentful environment to
tmp/assetIds.json, for later use by other scripts, speeding up their run time:
```
npm run blog assets cache
```

## License

Licensed under the EUPL v1.2.

For full details, see [LICENSE.md](LICENSE.md).
