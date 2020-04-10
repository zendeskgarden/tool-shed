/**
 * Copyright Zendesk, Inc.
 *
 * Use of this source code is governed under the Apache License, Version 2.0
 * found at http://www.apache.org/licenses/LICENSE-2.0.
 */

import { branch as getBranch, repository as getRepository, token as getToken } from '..';
import { handleErrorMessage, handleSuccessMessage } from '../../utils';
import { Command } from 'commander';
import { Octokit } from '@octokit/rest';
import { Ora } from 'ora';

type ARGS = {
  path?: string;
  token?: string;
  repository?: [string, string];
  branch?: string;
  spinner?: Ora;
};

/**
 * Execute the `github-commit` command.
 *
 * @param {string} [args.path] Path to a git directory.
 * @param {string} [args.token] GitHub personal access token.
 * @param {Array} [args.repository] GitHub repository.
 * @param {string} [args.spinner] Terminal spinner.
 *
 * @returns {Promise<string>} The latest commit SHA provided by a CI
 * environment variable or remote GitHub commits for the given git repository.
 */
export const execute = async (args: ARGS = {}): Promise<string | undefined> => {
  let retVal: string | undefined = process.env.CIRCLE_SHA1 || process.env.TRAVIS_COMMIT;

  if (!retVal) {
    try {
      const auth = args.token || (await getToken(args.spinner));
      const github = new Octokit({ auth });
      const repository = (args.repository || (await getRepository(args.path, args.spinner)))!;
      const sha = (args.branch || (await getBranch(args.path, args.spinner)))!;

      /* https://octokit.github.io/rest.js/v17#repos-list-commits */
      const commits = await github.repos.listCommits({
        owner: repository[0],
        repo: repository[1],
        sha
      });

      if (commits && commits.data) {
        retVal = commits.data[0].sha;
      }
    } catch (error) {
      handleErrorMessage(error, 'github-commit', args.spinner);
    }
  }

  return retVal;
};

export default (spinner: Ora) => {
  const command = new Command('github-commit');

  return command
    .description('output latest GitHub commit SHA for the repo branch')
    .arguments('[path]')
    .action(async path => {
      try {
        spinner.start();

        const commit = await execute({ path, spinner });

        if (commit) {
          handleSuccessMessage(commit, spinner);
        } else {
          spinner.fail('Commit not found');
          process.exit(1);
        }
      } finally {
        spinner.stop();
      }
    });
};