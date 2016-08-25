'use strict';

const _ = require('lodash');
let defaults = {
  type: 'console',
  filter: null,
  defaultTags: [],
  renderOptions: {
    console: {
      consoleBell: ['error'],
      timestamp: true,
      pretty: false,
      colors: {
        error: 'bgRed',
        warn: 'bgYellow',
        warning: 'bgYellow',
        notice: 'bgBlue'
      }
    },
    json: {
      tagsObject: false,
      additional: {}
    },
    cli: {
      consoleBell: ['error'],
      pretty: true,
      colors: {
        error: 'bgRed',
        warn: 'bgYellow',
        warning: 'bgYellow',
        notice: 'bgBlue'
      }
    }
  }
};

class Logger {
  constructor(options) {
    if (options && options.setDefaults) {
      defaults = _.defaultsDeep(options, defaults);
    }
    this.config = _.defaultsDeep(options, defaults);
    this.renderers = {
      console: require('./lib/console'),
      json: require('./lib/json'),
      cli: require('./lib/cli'),
    };
    if (this.config.plugins) {
      _.each(options.plugins, (renderFunction, renderName) => {
        if (typeof renderFunction === 'string') {
          this.renderers[renderName] = require(renderFunction);
          this.renderers[renderName].renderOptions = this.config.renderOptions[renderName];
          return;
        }
        this.renderers[renderName] = renderFunction;
        this.renderers[renderName].renderOptions = this.config.renderOptions[renderName];
      });
    }
    if (options && options.type === false) {
      this.config.type = false;
    }

    if (process.env.LOGR_TYPE) {
      this.config.type = process.env.LOGR_TYPE;
      //env vars come in as strings
      if (this.config.type === 'false') {
        this.config.type = false;
      }
    }

    if (process.env.LOGR_FILTER) {
      this.config.filter = process.env.LOGR_FILTER.split(',');
    }
    if (this.config.type !== false) {
      // type could be specified by a single string:
      if (typeof this.config.type === 'string') {
        this.config.type = [this.config.type];
      }
      this.config.type.forEach((type) => {
        console.log('registering type %s', type)
        if (!this.renderers[type]) {
          throw new Error('invalid type');
        }
        this.renderers[type].renderOptions = this.config.renderOptions[type];
      });
    }
    return this.log.bind(this);
  }

  filterMatch(filter, tags) {
    if (filter === null) {
      return true;
    }
    return filter.some((filterTag) => {
      return tags.indexOf(filterTag) !== -1;
    });
  }

  log(tags, message) {
    if (arguments.length === 1) {
      message = tags;
      tags = [];
    }
    if (!this.config.type) {
      return;
    }
    if (!this.filterMatch(this.config.filter, tags)) {
      return;
    }
    if (_.isError(message)){
      message = {
        message: message.message,
        stack: message.stack
      };
      if (tags.indexOf('error') < 0) {
        tags.push('error');
      }
    }
    tags = this.config.defaultTags.concat(tags);
    Object.keys(this.renderers).forEach((type) => {
      const renderer = this.renderers[type];
      if (renderer.renderOptions !== undefined) {
        const out = renderer(renderer.renderOptions, tags, message);
        /*eslint-disable no-console*/
        console.log(out);
        /*eslint-enable no-console*/
      }
    });
  }
}

module.exports = Logger;
