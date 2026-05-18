import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  JSON: { input: any; output: any; }
};

export enum AuthProvider {
  Credentials = 'credentials',
  Email = 'email',
  Github = 'github',
  Google = 'google'
}

export type CreateRoleInput = {
  name: Scalars['String']['input'];
};

export type CreateTodoInput = {
  description: Scalars['String']['input'];
  isCompleted: Scalars['Boolean']['input'];
  title: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type LoginRegisterRes = {
  __typename?: 'LoginRegisterRes';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  profileImage: Maybe<Scalars['String']['output']>;
  role: Role;
  token: Scalars['String']['output'];
};

export type LoginUserInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  adminLogin: LoginRegisterRes;
  createRole: Maybe<Role>;
  createTodo: Maybe<Todo>;
  deleteTodo: Maybe<Todo>;
  loginUser: LoginRegisterRes;
  registerUser: LoginRegisterRes;
  updateRole: Maybe<Role>;
  updateTodo: Maybe<Todo>;
  verifyEmail: VerifyEmailRes;
};


export type MutationAdminLoginArgs = {
  content: LoginUserInput;
};


export type MutationCreateRoleArgs = {
  content?: InputMaybe<CreateRoleInput>;
};


export type MutationCreateTodoArgs = {
  content?: InputMaybe<CreateTodoInput>;
};


export type MutationDeleteTodoArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLoginUserArgs = {
  content: LoginUserInput;
};


export type MutationRegisterUserArgs = {
  content: RegisterUserInput;
};


export type MutationUpdateRoleArgs = {
  content?: InputMaybe<UpdateRoleInput>;
};


export type MutationUpdateTodoArgs = {
  content?: InputMaybe<UpdatePostInput>;
};


export type MutationVerifyEmailArgs = {
  token?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  getAllRoles: Maybe<Array<Maybe<Role>>>;
  getAllTodos: Maybe<TodosList>;
  getRolebyId: Maybe<Role>;
  getRolebyName: Maybe<Role>;
  getTodo: Maybe<Todo>;
  getUser: Maybe<User>;
  getUserTodos: Maybe<TodosList>;
  getUsers: Maybe<UsersList>;
  me: Maybe<User>;
};


export type QueryGetAllTodosArgs = {
  pageNo?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  sortField?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<SortOrder>;
};


export type QueryGetRolebyIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetRolebyNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryGetTodoArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetUserArgs = {
  id: Scalars['String']['input'];
};


export type QueryGetUserTodosArgs = {
  pageNo?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  sortField?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<SortOrder>;
  userId: Scalars['ID']['input'];
};


export type QueryGetUsersArgs = {
  pageNo?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  sortField?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<SortOrder>;
};

export type RegisterUserInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  profileImage?: InputMaybe<Scalars['String']['input']>;
};

export type Role = {
  __typename?: 'Role';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type Todo = {
  __typename?: 'Todo';
  createdAt: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isCompleted: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  user: User;
};

export type TodosList = {
  __typename?: 'TodosList';
  currentPage: Maybe<Scalars['Int']['output']>;
  todos: Maybe<Array<Maybe<Todo>>>;
  totalCount: Maybe<Scalars['Int']['output']>;
  totalPages: Maybe<Scalars['Int']['output']>;
};

export type UpdatePostInput = {
  description: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  isCompleted: Scalars['Boolean']['input'];
  title: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type UpdateRoleInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type User = {
  __typename?: 'User';
  authProvider: Maybe<AuthProvider>;
  createdAt: Maybe<Scalars['DateTime']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isEmailVerified: Maybe<Scalars['Boolean']['output']>;
  name: Maybe<Scalars['String']['output']>;
  profileImage: Maybe<Scalars['String']['output']>;
  role: Maybe<Role>;
  todos: Maybe<Array<Maybe<Todo>>>;
  updatedAt: Maybe<Scalars['DateTime']['output']>;
};

export type UsersList = {
  __typename?: 'UsersList';
  currentPage: Maybe<Scalars['Int']['output']>;
  totalCount: Maybe<Scalars['Int']['output']>;
  totalPages: Maybe<Scalars['Int']['output']>;
  users: Maybe<Array<Maybe<User>>>;
};

export type VerifyEmailRes = {
  __typename?: 'verifyEmailRes';
  error: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  user: Maybe<User>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AuthProvider: AuthProvider;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateRoleInput: CreateRoleInput;
  CreateTodoInput: CreateTodoInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LoginRegisterRes: ResolverTypeWrapper<LoginRegisterRes>;
  LoginUserInput: LoginUserInput;
  Mutation: ResolverTypeWrapper<{}>;
  Query: ResolverTypeWrapper<{}>;
  RegisterUserInput: RegisterUserInput;
  Role: ResolverTypeWrapper<Role>;
  SortOrder: SortOrder;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Todo: ResolverTypeWrapper<Todo>;
  TodosList: ResolverTypeWrapper<TodosList>;
  UpdatePostInput: UpdatePostInput;
  UpdateRoleInput: UpdateRoleInput;
  User: ResolverTypeWrapper<User>;
  UsersList: ResolverTypeWrapper<UsersList>;
  verifyEmailRes: ResolverTypeWrapper<VerifyEmailRes>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output'];
  CreateRoleInput: CreateRoleInput;
  CreateTodoInput: CreateTodoInput;
  DateTime: Scalars['DateTime']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  LoginRegisterRes: LoginRegisterRes;
  LoginUserInput: LoginUserInput;
  Mutation: {};
  Query: {};
  RegisterUserInput: RegisterUserInput;
  Role: Role;
  String: Scalars['String']['output'];
  Todo: Todo;
  TodosList: TodosList;
  UpdatePostInput: UpdatePostInput;
  UpdateRoleInput: UpdateRoleInput;
  User: User;
  UsersList: UsersList;
  verifyEmailRes: VerifyEmailRes;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LoginRegisterResResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LoginRegisterRes'] = ResolversParentTypes['LoginRegisterRes']> = ResolversObject<{
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  profileImage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  adminLogin?: Resolver<ResolversTypes['LoginRegisterRes'], ParentType, ContextType, RequireFields<MutationAdminLoginArgs, 'content'>>;
  createRole?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType, Partial<MutationCreateRoleArgs>>;
  createTodo?: Resolver<Maybe<ResolversTypes['Todo']>, ParentType, ContextType, Partial<MutationCreateTodoArgs>>;
  deleteTodo?: Resolver<Maybe<ResolversTypes['Todo']>, ParentType, ContextType, RequireFields<MutationDeleteTodoArgs, 'id'>>;
  loginUser?: Resolver<ResolversTypes['LoginRegisterRes'], ParentType, ContextType, RequireFields<MutationLoginUserArgs, 'content'>>;
  registerUser?: Resolver<ResolversTypes['LoginRegisterRes'], ParentType, ContextType, RequireFields<MutationRegisterUserArgs, 'content'>>;
  updateRole?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType, Partial<MutationUpdateRoleArgs>>;
  updateTodo?: Resolver<Maybe<ResolversTypes['Todo']>, ParentType, ContextType, Partial<MutationUpdateTodoArgs>>;
  verifyEmail?: Resolver<ResolversTypes['verifyEmailRes'], ParentType, ContextType, Partial<MutationVerifyEmailArgs>>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  getAllRoles?: Resolver<Maybe<Array<Maybe<ResolversTypes['Role']>>>, ParentType, ContextType>;
  getAllTodos?: Resolver<Maybe<ResolversTypes['TodosList']>, ParentType, ContextType, Partial<QueryGetAllTodosArgs>>;
  getRolebyId?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType, RequireFields<QueryGetRolebyIdArgs, 'id'>>;
  getRolebyName?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType, RequireFields<QueryGetRolebyNameArgs, 'name'>>;
  getTodo?: Resolver<Maybe<ResolversTypes['Todo']>, ParentType, ContextType, RequireFields<QueryGetTodoArgs, 'id'>>;
  getUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryGetUserArgs, 'id'>>;
  getUserTodos?: Resolver<Maybe<ResolversTypes['TodosList']>, ParentType, ContextType, RequireFields<QueryGetUserTodosArgs, 'userId'>>;
  getUsers?: Resolver<Maybe<ResolversTypes['UsersList']>, ParentType, ContextType, Partial<QueryGetUsersArgs>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type RoleResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TodoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Todo'] = ResolversParentTypes['Todo']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isCompleted?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TodosListResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TodosList'] = ResolversParentTypes['TodosList']> = ResolversObject<{
  currentPage?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  todos?: Resolver<Maybe<Array<Maybe<ResolversTypes['Todo']>>>, ParentType, ContextType>;
  totalCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  totalPages?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  authProvider?: Resolver<Maybe<ResolversTypes['AuthProvider']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isEmailVerified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  profileImage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  todos?: Resolver<Maybe<Array<Maybe<ResolversTypes['Todo']>>>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UsersListResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UsersList'] = ResolversParentTypes['UsersList']> = ResolversObject<{
  currentPage?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  totalCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  totalPages?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  users?: Resolver<Maybe<Array<Maybe<ResolversTypes['User']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VerifyEmailResResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['verifyEmailRes'] = ResolversParentTypes['verifyEmailRes']> = ResolversObject<{
  error?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  DateTime?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  LoginRegisterRes?: LoginRegisterResResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  Todo?: TodoResolvers<ContextType>;
  TodosList?: TodosListResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UsersList?: UsersListResolvers<ContextType>;
  verifyEmailRes?: VerifyEmailResResolvers<ContextType>;
}>;

