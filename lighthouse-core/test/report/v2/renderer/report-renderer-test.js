/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const URL = require('../../../../lib/url-shim');
const DOM = require('../../../../report/v2/renderer/dom.js');
const DetailsRenderer = require('../../../../report/v2/renderer/details-renderer.js');
const Logger = require('../../../../report/v2/renderer/logger.js');
const ReportUIFeatures = require('../../../../report/v2/renderer/report-features.js');
const ReportRenderer = require('../../../../report/v2/renderer/report-renderer.js');
const sampleResults = require('../../../results/sample_v2.json');

const TEMPLATE_FILE = fs.readFileSync(__dirname + '/../../../../report/v2/templates.html', 'utf8');

describe('ReportRenderer V2', () => {
  let renderer;

  before(() => {
    global.URL = URL;
    global.Logger = Logger;
    global.ReportUIFeatures = ReportUIFeatures;

    // Stub out matchMedia for Node.
    global.matchMedia = function() {
      return {
        addListener: function() {}
      };
    };

    const document = jsdom.jsdom(TEMPLATE_FILE);
    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    renderer = new ReportRenderer.ReportRenderer(dom, detailsRenderer);
  });

  after(() => {
    global.URL = undefined;
    global.Logger = undefined;
    global.ReportUIFeatures = undefined;
    global.matchMedia = undefined;
  });

  describe('format helpers', () => {
    it('formats a date', () => {
      const timestamp = ReportRenderer.formatDateTime(sampleResults.generatedTime);
      assert.ok(timestamp.includes('Apr 5, 2017'));
    });

    it('formats a number', () => {
      assert.strictEqual(ReportRenderer.formatNumber(10), '10');
      assert.strictEqual(ReportRenderer.formatNumber(100.01), '100');
      assert.strictEqual(ReportRenderer.formatNumber(13000.456), '13,000.5');
    });

    it('calculates a score ratings', () => {
      assert.equal(ReportRenderer.calculateRating(0), 'fail');
      assert.equal(ReportRenderer.calculateRating(10), 'fail');
      assert.equal(ReportRenderer.calculateRating(45), 'average');
      assert.equal(ReportRenderer.calculateRating(55), 'average');
      assert.equal(ReportRenderer.calculateRating(75), 'pass');
      assert.equal(ReportRenderer.calculateRating(80), 'pass');
      assert.equal(ReportRenderer.calculateRating(100), 'pass');
    });
  });

  describe.only('renderReport', () => {
    it('should render a report', () => {
      const container = renderer._dom._document.body;
      const output = renderer.renderReport(sampleResults, container);
      assert.ok(container.contains(output), 'report appended to container');
      assert.ok(output.classList.contains('lh-container'));
      assert.ok(output.querySelector('.lh-header'), 'has a header');
      assert.ok(output.querySelector('.lh-report'), 'has report body');
    });

    it('renders additional reports by replacing the existing one', () => {
      const container = renderer._dom._document.body;
      const oldReport = renderer.renderReport(sampleResults, container);
      const newReport = renderer.renderReport(sampleResults, container);
      assert.ok(!container.contains(oldReport), 'old report was removed');
      assert.ok(container.contains(newReport), 'new report appended to container');
    });

    it('should render an exception for invalid input', () => {
      const container = renderer._dom._document.body;
      const output = renderer.renderReport({
        get reportCategories() {
          throw new Error();
        }
      }, container);
      assert.ok(output.classList.contains('lh-exception'));
    });

    it('renders a header', () => {
      const header = renderer._renderReportHeader(sampleResults);
      assert.ok(header.querySelector('.lh-export'), 'contains export button');

      assert.ok(header.querySelector('.lh-config__timestamp').textContent.includes('Apr 5, 2017'),
          'formats the generated datetime');
      assert.equal(header.querySelector('.lh-metadata__url').textContent, sampleResults.url);
      const url = header.querySelector('.lh-metadata__url');
      assert.equal(url.textContent, sampleResults.url);
      assert.equal(url.href, sampleResults.url);

      // Check runtime settings were populated.
      const enables = header.querySelectorAll('.lh-env__enabled');
      const names = header.querySelectorAll('.lh-env__name');
      const descriptions = header.querySelectorAll('.lh-env__description');
      sampleResults.runtimeConfig.environment.forEach((env, i) => {
        assert.equal(enables[i].textContent, env.enabled ? 'Enabled' : 'Disabled');
        assert.equal(names[i].textContent, env.name);
        assert.equal(descriptions[i].textContent, env.description);
      });
    });

    it('renders a left nav', () => {
      const header = renderer._renderReportNav(sampleResults);
      assert.equal(header.querySelectorAll('.lh-leftnav__item').length, 4);

      const categories = header.querySelectorAll('.leftnav-item__category');
      const scores = header.querySelectorAll('.leftnav-item__score');
      sampleResults.reportCategories.forEach((cat, i) => {
        assert.equal(categories[i].textContent, cat.name);
        assert.equal(scores[i].textContent, Math.round(ReportRenderer.formatNumber(cat.score)));
      });
    });

    it('renders a footer', () => {
      const footer = renderer._renderReportFooter(sampleResults);
      const footerContent = footer.querySelector('.lh-footer').textContent;
      assert.ok(footerContent.includes('Generated by Lighthouse 1.6.0', 'includes lh version'));
      assert.ok(footerContent.includes('Apr 5, 2017'), 'includes timestamp');
    });

    it('renders an audit', () => {
      const audit = sampleResults.reportCategories[0].audits[0];
      const auditDOM = renderer._renderAudit(audit);

      const title = auditDOM.querySelector('.lh-score__title');
      const description = auditDOM.querySelector('.lh-score__description');
      const score = auditDOM.querySelector('.lh-score__value');

      assert.equal(title.textContent, audit.result.description);
      assert.ok(description.querySelector('a'), 'audit help text contains coverted markdown links');
      assert.equal(score.textContent, '0');
      assert.ok(score.classList.contains('lh-score__value--fail'));
      assert.ok(score.classList.contains(`lh-score__value--${audit.result.scoringMode}`));
    });

    it('renders a category', () => {
      const category = sampleResults.reportCategories[0];
      const categoryDOM = renderer._renderCategory(category);

      const score = categoryDOM.querySelector('.lh-score');
      const value = categoryDOM.querySelector('.lh-score  > .lh-score__value');
      const title = score.querySelector('.lh-score__title');
      const description = score.querySelector('.lh-score__description');

      assert.deepEqual(score, score.firstElementChild, 'first child is a score');
      assert.ok(value.classList.contains('lh-score__value--numeric'),
                'category score is numeric');
      assert.equal(value.textContent, Math.round(category.score), 'category score is rounded');
      assert.equal(title.textContent, category.name, 'title is set');
      assert.ok(description.querySelector('a'), 'description contains converted markdown links');

      const audits = categoryDOM.querySelectorAll('.lh-category > .lh-audit, ' +
          '.lh-category > .lh-passed-audits > .lh-audit');
      assert.equal(audits.length, category.audits.length, 'renders correct number of audits');
    });
  });

  describe('grouping passed/failed', () => {
    it('separates audits in the DOM', () => {
      const category = sampleResults.reportCategories[0];
      const elem = renderer._renderCategory(category);
      const passedAudits = elem.querySelectorAll('.lh-category > .lh-passed-audits > .lh-audit');
      const failedAudits = elem.querySelectorAll('.lh-category > .lh-audit');

      assert.equal(passedAudits.length + failedAudits.length, category.audits.length);
      assert.equal(passedAudits.length, 4);
      assert.equal(failedAudits.length, 7);
    });

    it('doesnt create a pased section if there were 0 passed', () => {
      const category = JSON.parse(JSON.stringify(sampleResults.reportCategories[0]));
      category.audits.forEach(audit => audit.score = 0);
      const elem = renderer._renderCategory(category);
      const passedAudits = elem.querySelectorAll('.lh-category > .lh-passed-audits > .lh-audit');
      const failedAudits = elem.querySelectorAll('.lh-category > .lh-audit');

      assert.equal(passedAudits.length, 0);
      assert.equal(failedAudits.length, 11);

      assert.equal(elem.querySelector('.lh-passed-audits-summary'), null);
    });
  });

  it('can set a custom templateContext', () => {
    assert.equal(renderer._templateContext, renderer._dom.document());

    const otherDocument = jsdom.jsdom(TEMPLATE_FILE);
    renderer.setTemplateContext(otherDocument);
    assert.equal(renderer._templateContext, otherDocument);
  });
});
