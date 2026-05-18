import UserQueries from "./UserQueries";
import TodoQueries from "./TodoQueries";
import RoleQueries from "./RoleQueries";

const queries = {
  Query: {
    ...UserQueries,
    ...TodoQueries,
    ...RoleQueries,
  },
};

export default queries;
