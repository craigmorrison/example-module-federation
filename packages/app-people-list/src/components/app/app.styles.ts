import { css } from '@emotion/react';

export const siteWrapper = css`
  background: #eee;
  font-family: sans-serif;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto;
`;

export const banner = css`
  padding: 1rem;
  background: #333;
  color: #ee3;
`;

export const bannerTitle = css`
  margin: 0;
`;

export const siteMain = css`
  padding: 1rem;
`;

export const contentInfo = css`
  padding: 1rem;
  background: #333;
  color: #fff;
`;

export const contentInfoLink = css`
  color: #0df;

  :hover {
    color: #33f3ff;
  }
`;
