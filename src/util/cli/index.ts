import { getNodeSys } from '../node/node-sys';
import { getConfigFilePath, parseArgv, help, init, isValidNodeVersion, overrideConfigFromArgv } from './cli-utils';
import { loadConfigFile } from '../node/load-config';
import { Logger } from '../interfaces';
import { NodeLogger } from '../node/node-logger';
import * as path from 'path';


export function run(process: NodeJS.Process, minNodeVersion?: number, logger?: Logger) {
  const task = process.argv[2];
  const argv = parseArgv(process);
  logger = logger || new NodeLogger({ process });

  process.title = 'stencil';
  process.on('unhandledRejection', (r: any) => logger.error(r));
  process.env.IONIC_CLI_BIN = __filename;


  if (argv.help) {
    help(process);
    return process.exit(0);
  }

  if (!argv.skipNodeCheck) {
    minNodeVersion = minNodeVersion || 6.11;
    const currentNodeVersion = process.version;
    if (!isValidNodeVersion(minNodeVersion, currentNodeVersion)) {
      logger.error(`Your Node.js version is ${currentNodeVersion}. Please update to the latest Node LTS version.`);
      return process.exit(1);
    }
  }

  if (argv.version) {
    const packageJson = require(path.join(__dirname, '../package.json'));
    console.log(packageJson.version);
    return process.exit(0);
  }

  if (task === 'init') {
    init(process);
    return process.exit(0);
  }

  const configPath = getConfigFilePath(process, argv);
  const config = loadConfigFile(process, configPath, logger);
  if (!config) {
    logger.warn(`"stencil init" can be used to generate the "stencil.config.js" file.`);
    return process.exit(1);
  }

  // override the config values with any cli arguments
  overrideConfigFromArgv(config, argv);

  if (!config.sys) {
    // if the config was not provided then use the
    // defaul stencil sys found in bin
    config.sys = getNodeSys(path.join(__dirname, '../'), logger);
  }

  if (!config.logger) {
    // if a logger was not provided then use the
    // defaul stencil command line logger found in bin
    config.logger = logger;
  }

  if (config.logLevel) {
    config.logger.level = config.logLevel;
  }

  switch (task) {
    case 'build':
      var stencil = require(path.join(__dirname, '../compiler/index.js'));
      stencil.build(config);

      if (config.watch) {
        process.once('SIGINT', () => {
          return process.exit(0);
        });
      }
      break;

    default:
      logger.error(`Invalid stencil command, please see the options below:`);
      help(process);
      break;
  }
}