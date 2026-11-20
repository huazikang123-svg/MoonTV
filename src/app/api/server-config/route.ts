/* eslint-disable no-console */

import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  // Temporary non-sensitive runtime diagnostic. Never send secret values.
  if (request.nextUrl.searchParams.get('diagnose') === 'password') {
    const requestContext = getOptionalRequestContext();
    const cloudflareEnv = requestContext?.env as
      | { PASSWORD?: unknown }
      | undefined;
    const bindingPassword = cloudflareEnv?.PASSWORD;
    const processPassword = process.env.PASSWORD;

    return NextResponse.json(
      {
        requestContextAvailable: Boolean(requestContext),
        passwordBindingAvailable:
          typeof bindingPassword === 'string' && bindingPassword.length > 0,
        processPasswordAvailable:
          typeof processPassword === 'string' && processPassword.length > 0,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  console.log('server-config called: ', request.url);

  const config = await getConfig();
  const result = {
    SiteName: config.SiteConfig.SiteName,
    StorageType: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
  };
  return NextResponse.json(result);
}
