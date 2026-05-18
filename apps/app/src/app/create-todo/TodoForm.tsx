"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation } from "@apollo/client";
import toast from "react-hot-toast";

import LoadingDots from "@/components/loadingDots";
import { CREATE_TODO } from "@/graphql/mutations/todo";

const LoginForm = () => {
  const router = useRouter();
  const session = useSession();
  const [createPost, { loading }] = useMutation(CREATE_TODO);

  const handleFormSubmit = async (e: any) => {
    e.preventDefault();

    try {
      const response = await createPost({
        variables: {
          content: {
            title: e.target.title.value,
            description: e.target.description.value,
            isCompleted: e.target.isCompleted.checked,
            userId: session?.data?.user?.id,
          },
        },
      });

      router.push("/");
      toast.success("Todo created successfully");
    } catch (error: any) {
      console.log(error.message);
      toast.error(error.message);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <form
        onSubmit={handleFormSubmit}
        className="w-full flex flex-col space-y-4 bg-gray-50 px-4 py-8 sm:px-16"
      >
        <div>
          <label
            htmlFor="title"
            className="block text-xs text-gray-600 uppercase"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            type="title"
            placeholder="Title..."
            required
            className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="block text-xs text-gray-600 uppercase"
          >
            Description
          </label>
          <input
            id="description"
            name="description"
            type="description"
            placeholder="Description..."
            autoComplete="description"
            required
            className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
          />
        </div>
        <div className="flex space-x-2">
          <input
            id="default-checkbox"
            name="isCompleted"
            type="checkbox"
            value=""
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
          ></input>
          <label
            htmlFor="password"
            className="block text-xs text-gray-600 uppercase"
          >
            Completed
          </label>
        </div>
        <button
          disabled={loading}
          className={`${
            loading
              ? "cursor-not-allowed border-gray-200 bg-gray-100"
              : "border-black bg-black text-white hover:bg-white hover:text-black"
          } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
        >
          {loading ? <LoadingDots /> : <p>Create</p>}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
