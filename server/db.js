const pg = require("pg");
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_auth_store_db"
);
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const secret = process.env.JWT || "shhhhlocal";

const createTables = async () => {
  const SQL = `
    DROP TABLE IF EXISTS favorites;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS products;
    CREATE TABLE users(
      id UUID PRIMARY KEY,
      username VARCHAR(20) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    );
    CREATE TABLE products(
      id UUID PRIMARY KEY,
      name VARCHAR(20)
    );
    CREATE TABLE favorites(
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) NOT NULL,
      product_id UUID REFERENCES products(id) NOT NULL,
      CONSTRAINT unique_user_id_and_product_id UNIQUE (user_id, product_id)
    );
  `;
  await client.query(SQL);
};

const createUser = async ({ username, password }) => {
  const SQL = `
    INSERT INTO users(id, username, password) VALUES($1, $2, $3) RETURNING *
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    username,
    await bcrypt.hash(password, 10),
  ]);
  return response.rows[0];
};

const createProduct = async ({ name }) => {
  const SQL = `
    INSERT INTO products(id, name) VALUES($1, $2) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), name]);
  return response.rows[0];
};

const createFavorite = async ({ user_id, product_id }) => {
  const SQL = `
    INSERT INTO favorites(id, user_id, product_id) VALUES($1, $2, $3) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), user_id, product_id]);
  return response.rows[0];
};

const destroyFavorite = async ({ user_id, id }) => {
  const SQL = `
    DELETE FROM favorites WHERE user_id=$1 AND id=$2
  `;
  await client.query(SQL, [user_id, id]);
};

const authenticate = async ({ username, password }) => {
  const SQL = `
    SELECT id, username, password FROM users WHERE username=$1;
  `;
  const response = await client.query(SQL, [username]);

  const user = response.rows[0];
  let passwordMatches = false;

  if (user) {
    passwordMatches = await bcrypt.compare(password, user.password);
  }

  if (passwordMatches) {
    const token = jwt.sign({ id: user.id }, secret);
    return token;
  }

  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const findUserWithToken = async (token) => {
  try {
    const { id } = jwt.verify(token, secret);
    const response = await client.query(
      "SELECT id, username FROM users WHERE id = $1",
      [id]
    );
    if (response.rows.length) {
      return response.rows[0];
    }
    const error = Error("bad token");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad token");
    error.status = 401;
    throw error;
  }
};

const fetchUsers = async () => {
  const response = await client.query("SELECT id, username FROM users");
  return response.rows;
};

const fetchProducts = async () => {
  const response = await client.query("SELECT id, name FROM products");
  return response.rows;
};

const fetchFavorites = async (user_id) => {
  const response = await client.query(
    "SELECT * FROM favorites WHERE user_id = $1",
    [user_id]
  );
  return response.rows;
};

module.exports = {
  client,
  createTables,
  createUser,
  createProduct,
  fetchUsers,
  fetchProducts,
  createFavorite,
  destroyFavorite,
  fetchFavorites,
  authenticate,
  findUserWithToken,
};
