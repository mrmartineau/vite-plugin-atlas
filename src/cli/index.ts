import { runContext } from './context.js';
import { runExport } from './export.js';
import { runList } from './list.js';
import { runValidate } from './validate.js';
import { bootAtlas } from './vite-boot.js';

const HELP = `Atlas — Component Documentation Tool

Usage:
  atlas list                      List all discovered components
  atlas context <name> [name...]  Output component context for AI consumption
  atlas validate <file>           Validate an examples file
  atlas export [--outdir dir]     Export static API files

Options:
  --help    Show this help message
`;

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0 || args.includes('--help')) {
		console.log(HELP);
		process.exit(0);
	}

	const command = args[0];

	try {
		switch (command) {
			case 'list': {
				const ctx = await bootAtlas();
				runList(ctx);
				break;
			}

			case 'context': {
				const names = args.slice(1);
				if (names.length === 0) {
					process.stderr.write('Usage: atlas context <name> [name...]\n');
					process.exit(1);
				}
				const ctx = await bootAtlas();
				await runContext(ctx, names);
				break;
			}

			case 'validate': {
				const filePath = args[1];
				if (!filePath) {
					process.stderr.write('Usage: atlas validate <file>\n');
					process.exit(1);
				}
				await runValidate(filePath);
				break;
			}

			case 'export': {
				let outdir = 'atlas-static';
				const outdirIdx = args.indexOf('--outdir');
				if (outdirIdx !== -1 && args[outdirIdx + 1]) {
					outdir = args[outdirIdx + 1];
				}
				const ctx = await bootAtlas();
				await runExport(ctx, outdir);
				break;
			}

			default:
				process.stderr.write(`Unknown command: ${command}\n\n`);
				console.log(HELP);
				process.exit(1);
		}
	} catch (err) {
		process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
		process.exit(1);
	}
}

main();
