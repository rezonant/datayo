import 'reflect-metadata';
import 'source-map-support/register';
import { suite, ConsoleReporter, JUnitXMLReporter } from 'razmin';
import * as path from 'path';

suite()
    .withOptions({
        reporting: {
            reporters: [
                new ConsoleReporter(),
                new JUnitXMLReporter(path.join(process.cwd(), 'test-results', 'razmin', 'test-results.xml'))
            ]
        }
    })
    .include(['./**/*.test.js'])
    .run()
;