/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const Audit = require('./audit');
const TracingProcessor = require('../lib/traces/tracing-processor');
const Formatter = require('../report/formatter');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
//   https://www.desmos.com/calculator/uti67afozh
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1700;
const SCORING_MEDIAN = 10000;
// This aligns with the external TTI targets in https://goo.gl/yXqxpL
const SCORING_TARGET = 5000;

const distribution = TracingProcessor.getLogNormalDistribution(
  SCORING_MEDIAN,
  SCORING_POINT_OF_DIMINISHING_RETURNS
);

class FirstInteractiveMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'first-interactive',
      description: 'First Interactive (beta)',
      helpText: 'The first point at which necessary scripts of the page have loaded ' +
          'and the CPU is idle enough to handle most user input.',
      optimalValue: SCORING_TARGET.toLocaleString() + 'ms',
      scoringMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces']
    };
  }

  /**
   * Identify the time the page is "first interactive"
   * @see https://docs.google.com/document/d/1GGiI9-7KeY3TPqS3YT271upUVimo-XiL5mwWorDUD4c/edit#
   *
   * @param {!Artifacts} artifacts
   * @return {!Promise<!AuditResult>}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    return artifacts.requestFirstInteractive(trace, artifacts)
      .then(firstInteractive => {
        let score = 100 * distribution.computeComplementaryPercentile(firstInteractive.timeInMs);
        // Clamp the score to 0 <= x <= 100.
        score = Math.min(100, score);
        score = Math.max(0, score);
        score = Math.round(score);

        const displayValue = Math.round(firstInteractive.timeInMs / 10) * 10;
        return {
          score,
          rawValue: firstInteractive.timeInMs,
          displayValue: `${displayValue.toLocaleString()}ms`,
          optimalValue: this.meta.optimalValue,
          extendedInfo: {
            value: firstInteractive,
            formatter: Formatter.SUPPORTED_FORMATS.NULL,
          }
        };
      });
  }
}

module.exports = FirstInteractiveMetric;
