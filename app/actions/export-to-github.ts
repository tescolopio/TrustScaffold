'use server';

import { revalidatePath } from 'next/cache';
import { Octokit } from '@octokit/rest';

import { buildExportFiles, buildPullRequestBody } from '@/lib/export/export-helpers';
import { loadExportContext } from '@/lib/export/load-export-context';

type ExportResult =
  | {
      ok: true;
      prUrl: string;
      branchName: string;
      exportedCount: number;
    }
  | {
      ok: false;
      error: string;
    };

export async function exportApprovedDocsToGithubAction(formData: FormData): Promise<ExportResult> {
  try {
    const { supabase, integration, token, docs } = await loadExportContext('github', formData);
    const octokit = new Octokit({ auth: token });
    const files = buildExportFiles(docs);
    const branchName = `trustscaffold-soc2-update-${Date.now()}`;

    const { data: repo } = await octokit.repos.get({
      owner: integration.repo_owner,
      repo: integration.repo_name,
    });

    const baseBranch = integration.default_branch || repo.default_branch;
    const { data: ref } = await octokit.git.getRef({
      owner: integration.repo_owner,
      repo: integration.repo_name,
      ref: `heads/${baseBranch}`,
    });

    const baseCommitSha = ref.object.sha;
    const { data: baseCommit } = await octokit.git.getCommit({
      owner: integration.repo_owner,
      repo: integration.repo_name,
      commit_sha: baseCommitSha,
    });

    const { data: tree } = await octokit.git.createTree({
      owner: integration.repo_owner,
      repo: integration.repo_name,
      base_tree: baseCommit.tree.sha,
      tree: files.map((file) => ({
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        content: file.content,
      })),
    });

    const { data: commit } = await octokit.git.createCommit({
      owner: integration.repo_owner,
      repo: integration.repo_name,
      message: `TrustScaffold approved control set update ${new Date().toISOString()}`,
      tree: tree.sha,
      parents: [baseCommitSha],
    });

    await octokit.git.createRef({
      owner: integration.repo_owner,
      repo: integration.repo_name,
      ref: `refs/heads/${branchName}`,
      sha: commit.sha,
    });

    const { data: pullRequest } = await octokit.pulls.create({
      owner: integration.repo_owner,
      repo: integration.repo_name,
      title: `TrustScaffold compliance update ${new Date().toISOString().slice(0, 10)}`,
      head: branchName,
      base: baseBranch,
      body: buildPullRequestBody('github', docs),
    });

    const repoUrl = repo.html_url;
    const prUrl = pullRequest.html_url;
    const { error: updateError } = await supabase
      .from('generated_docs')
      .update({
        committed_to_repo: true,
        repo_url: repoUrl,
        pr_url: prUrl,
      })
      .in('id', docs.map((doc) => doc.id));

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Create "exported" revision for each exported doc
    for (const doc of docs) {
      await supabase.rpc('insert_document_revision', {
        p_document_id: doc.id,
        p_source: 'exported',
        p_content_markdown: doc.content_markdown,
        p_commit_sha: commit.sha,
        p_pr_url: prUrl,
      });
    }

    revalidatePath('/generated-docs');
    revalidatePath('/settings');

    return {
      ok: true,
      prUrl,
      branchName,
      exportedCount: docs.length,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'GitHub export failed',
    };
  }
}