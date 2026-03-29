import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Updated import
import PeopleList from '../people-list';

const queryClient = new QueryClient();

function People(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <PeopleList />
    </QueryClientProvider>
  );
}

export default People;
