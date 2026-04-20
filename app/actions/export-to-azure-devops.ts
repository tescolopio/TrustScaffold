'use server';

import { revalidatePath } from 'next/cache';

import { buildExportFiles, buildPullRequestBody, parseAzureDevOpsOwner } from '@/lib/export/export-helpers';
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

async function azureRequest<T>(url: string, token: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Azure DevOps request failed: ${message}`);
  }

  return response.json() as Promise<T>;
}

export async function exportApprovedDocsToAzureDevOpsAction(formData: FormData): Promise<ExportResult> {
  try {
    const { supabase, integration, token, docs } = await loadExportContext('azure_devops', formData);
    const { organization, project } = parseAzureDevOpsOwner(integration.repo_owner);
    const files = buildExportFiles(docs);
    const branchName = `trustscaffold-soc2-update-${Date.now()}`;
    const apiVersion = '7.1';
    const repositoryBaseUrl = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(integration.repo_name)}`;
    const baseBranch = integration.default_branch || 'main';

    const refs = await azureRequest<{ value: Array<{ name: string; objectId: string }> }>(
      `${repositoryBaseUrl}/refs?filter=heads/${encodeURIComponent(baseBranch)}&api-version=${apiVersion}`,
      token,
    );

    const defaultRef = refs.value[0];

    if (!defaultRef?.objectId) {
      throw new Error(`Unable to resolve default branch ${baseBranch} in Azure DevOps`);
    }

    await azureRequest(
      `${repositoryBaseUrl}/pushes?api-version=${apiVersion}`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          refUpdates: [
            {
              name: `refs/heads/${branchName}`,
              oldObjectId: '0000000000000000000000000000000000000000',
            },
          ],
          commits: [
            {
              comment: `TrustScaffold approved control set update ${new Date().toISOString()}`,
              parents: [defaultRef.objectId],
              changes: files.map((file) => ({
                changeType: 'add',
                item: { path: `/${file.path}` },
                newContent: {
                  content: file.content,
                  contentType: 'rawtext',
                },
              })),
            },
          ],
        }),
      },
    );

    const pr = await azureRequest<{ url: string; repository?: { remoteUrl?: string } }>(
      `${repositoryBaseUrl}/pullrequests?api-version=${apiVersion}`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          sourceRefName: `refs/heads/${branchName}`,
          targetRefName: `refs/heads/${baseBranch}`,
          title: `TrustScaffold compliance update ${new Date().toISOString().slice(0, 10)}`,
          description: buildPullRequestBody('azure_devops', docs),
        }),
      },
    );

    const { error: updateError } = await supabase
      .from('generated_docs')
      .update({
        committed_to_repo: true,
        repo_url: pr.repository?.remoteUrl ?? null,
        pr_url: pr.url,
      })
      .in('id', docs.map((doc) => doc.id));

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath('/generated-docs');
    revalidatePath('/settings');

    return {
      ok: true,
      prUrl: pr.url,
      branchName,
      exportedCount: docs.length,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Azure DevOps export failed',
    };
  }
}