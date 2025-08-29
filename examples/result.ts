import { err, ok, Result, None } from "../src";

import none from "../src/option/none";

enum UserError {
  NotFound = "User not found",
}

enum PostError {
  NotFound = "Post not found",
  InvalidUserId = "Invalid user id",
}

type User = {
  name: string;
  age: number;
  id: string;
};

type Post = {
  title: string;
  content: string;
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getUser(): Promise<Result<User, UserError>> {
  return sleep(1000).then(() => ok({ name: "John", age: 20, id: "1" }));
}

async function getPostsByUserId(
  userId: string
): Promise<Result<Post[], PostError>> {
  return sleep(1000).then(() => err(PostError.NotFound));
}

async function main(): Promise<Result<None, Error>> {
  const userResponse = await getUser();
  const user = userResponse.expect("Failed to get user");
  const postsResponse = await getPostsByUserId(user.id);

  console.log(`User: ${user.name}, Posts: ${postsResponse.unwrap()}`);

  return ok(none());
}

main();
