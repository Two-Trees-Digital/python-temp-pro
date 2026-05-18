import { Metadata } from "next";

import Layout from "@/components/layout";
import TodoList from "@/components/todoList";

export default function Home() {
  return (
    <Layout>
      <div className="min-h-screen px-4">
        <h1 className="text-xl font-semibold py-6 text-center">All Todos</h1>
        <TodoList />
      </div>
    </Layout>
  );
}

export const metadata: Metadata = {
  title: "My Todos",
};
