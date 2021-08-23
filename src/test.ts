import 'reflect-metadata';
import 'source-map-support/register';
import { suite, ConsoleReporter, JUnitXMLReporter } from 'razmin';

suite()
    .withOptions({
        reporting: {
            reporters: [
                new ConsoleReporter(),
                new JUnitXMLReporter('test-results/razmin')
            ]
        }
    })
    .include(['./**/*.test.js'])
    .run()
;