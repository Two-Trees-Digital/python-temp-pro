import UserQueries from "./UserMutations";
import TodoMutations from "./TodoMutations";
import RoleMutations from "./RoleMutations";

const mutations = {
  Mutation: {
    ...UserQueries,
    ...TodoMutations,
    ...RoleMutations,
  },
};

export default mutations;
