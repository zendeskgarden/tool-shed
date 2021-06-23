/**
 * Copyright Zendesk, Inc.
 *
 * Use of this source code is governed under the Apache License, Version 2.0
 * found at http://www.apache.org/licenses/LICENSE-2.0.
 */

import commander, { Command } from 'commander';
import { siteId as getSiteId, token as getToken } from '..';
import { handleErrorMessage, handleSuccessMessage } from '../../utils';
import { Ora } from 'ora';
import { exec } from 'child_process';

interface INetlifyDeployArgs {
  dir: string;
  production?: boolean;
  token?: string;
  siteId?: string;
  message?: string;
  spinner?: Ora;
}

/**
 * Execute the `netlify-deploy` command.
 *
 * @param {string} args.dir Folder to deploy.
 * @param {boolean} [args.production] Determine whether this is a production deploy.
 * @param {string} [args.message] Deploy message.
 * @param {string} [args.token] Netlify personal access token.
 * @param {string} [args.siteId] Netlify site API ID.
 * @param {Ora} [args.spinner] Terminal spinner.
 *
 * @returns {object} The Netlify deployment and log URLs.
 */
export const execute = async (args: INetlifyDeployArgs): Promise<string> => {
  const token = args.token || (await getToken(args.spinner));
  const siteId = args.siteId || (await getSiteId(args.spinner));
  const production = args.production ? '--prod' : '';

  return new Promise((resolve, reject) => {
    exec(
      `netlify deploy ${production} --dir=${args.dir} --site=${siteId} --auth=${token} --message=${args.message}`,
      (err, stdout, stderr) => {
        if (err) {
          process.exitCode = 1;
          handleErrorMessage(err, 'netlify-deploy', args.spinner);
          reject(stderr);
        } else {
          resolve(stdout);
        }
      }
    );
  });
};

export default (spinner: Ora): commander.Command => {
  const command = new Command('netlify-deploy');

  return command
    .description('deploy to a Netlify site')
    .arguments('<dir>')
    .option('-p, --production', 'production deploy')
    .option('-i, --id <id>', 'site API ID')
    .option('-t, --token <token>', 'access token')
    .option('-m, --message <message>', 'deploy message')
    .action(async dir => {
      try {
        spinner.start();

        const options = command.opts();
        const result = await execute({
          dir,
          production: options.production,
          token: options.token,
          siteId: options.id,
          message: options.message,
          spinner
        });

        if (result) {
          handleSuccessMessage(result, spinner);
        } else {
          throw new Error();
        }
      } catch {
        spinner.fail(`Unable to deploy ${dir}`);
        process.exitCode = 1;
      } finally {
        spinner.stop();
      }
    });
};
