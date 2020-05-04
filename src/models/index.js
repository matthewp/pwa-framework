export async function getGists() {
  let res = await fetch(`https://api.github.com/users/matthewp/gists`);
  let gists = await res.json();
  return { gists };
}
