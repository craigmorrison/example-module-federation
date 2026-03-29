import { css } from '@emotion/react';

// People
export const sectionHeading = css`
  font-size: 2rem;
  margin: 0 0 1rem 0;
`;

export const peopleHeading = css`
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
`;

export const peopleList = css`
  list-style: none;
  padding-left: 0;
  display: grid;

  @media screen and (min-width: 40em) {
    grid-template-columns: 1fr 1fr;
    grid-gap: 1rem;
  }

  @media screen and (min-width: 60em) {
    gridtemplatecolumns: '1fr 1fr 1fr';
  }
`;

export const peopleItem = css`
  background: #fff;
  border-radius: 6px;
  border: 1px solid #ccc;
  padding: 1rem 1rem 0.5rem 1rem;
  margin-bottom: 0.5rem;
`;

export const definitionList = css`
  margin: 0;
  color: #222;
`;

export const defintionListItem = css`
  display: grid;
  grid-template-columns: 7em 1fr;
  margin: 0 0 0.5rem 0;
`;

export const defintionListKey = css`
  margin: 0;
`;

export const defintionListValue = css`
  font-weight: bold;
  margin: 0;
`;

export const loadingIndicator = css`
  display: grid;
  height: 100%;
  align-content: center;
  justify-content: center;
`;
