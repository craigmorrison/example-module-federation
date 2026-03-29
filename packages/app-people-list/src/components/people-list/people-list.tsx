/* eslint-disable camelcase */
import { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query'; // Updated import
import {
  sectionHeading,
  peopleHeading,
  peopleItem,
  peopleList,
  definitionList,
  defintionListItem,
  defintionListKey,
  defintionListValue,
  loadingIndicator
} from './people-list.styles';

type swPerson = {
  name: string;
  height: string;
  mass: string;
  hair_color: string;
  skin_color: string;
  eye_color: string;
  birth_year: string;
  gender: string;
  homeworld: string;
  films: string[];
  species: [];
  vehicles: string[];
  starships: string[];
  created: string;
  edited: string;
  url: string;
};

type swPersonList = {
  count: number;
  next: string | null;
  previous: string | null;
  results: swPerson[];
};

function PeopleList(): ReactElement {
  const { isLoading, error, data } = useQuery({
    queryKey: ['repoData'], // Updated to use queryKey
    queryFn: () =>
      fetch('https://swapi.dev/api/people').then((res) => res.json())
  });

  if (isLoading) {
    return (
      <div css={loadingIndicator}>
        <p>LOADING</p>
      </div>
    );
  }

  if (error) {
    return <>{`An error has occurred: ${error}`}</>;
  }

  return (
    <>
      <h2 css={sectionHeading}>People</h2>
      <ul css={peopleList}>
        {data?.results.map((person: swPerson) => (
          <li key={person.name} css={peopleItem}>
            <h3 css={peopleHeading}>{person.name}</h3>
            <dl css={definitionList}>
              <div css={defintionListItem}>
                <dt css={defintionListKey}>Height:</dt>
                <dl css={defintionListValue}>{person.height}</dl>
              </div>
              <div css={defintionListItem}>
                <dt css={defintionListKey}>Mass:</dt>
                <dl css={defintionListValue}>{person.mass}</dl>
              </div>
              <div css={defintionListItem}>
                <dt css={defintionListKey}>Hair color:</dt>
                <dl css={defintionListValue}>{person.hair_color}</dl>
              </div>
              <div css={defintionListItem}>
                <dt css={defintionListKey}>Eye color:</dt>
                <dl css={defintionListValue}>{person.eye_color}</dl>
              </div>
              <div css={defintionListItem}>
                <dt css={defintionListKey}>Skin color:</dt>
                <dl css={defintionListValue}>{person.skin_color}</dl>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export default PeopleList;
