import { type RouteConfig, route } from '@react-router/dev/routes';

export default [
  route('/', 'routes/_index.tsx'),
  route('/table/*', 'routes/table.$.tsx'),
  route('/counter/*', 'routes/counter.$.tsx'),
  route('/people/*', 'routes/people.$.tsx')
] satisfies RouteConfig;
