import { useState, useEffect } from "react";

const Login = ({ login }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const submit = async (ev) => {
    ev.preventDefault();
    try {
      await login({ username, password });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <form onSubmit={submit}>
      <input
        value={username}
        placeholder="username"
        onChange={(ev) => setUsername(ev.target.value)}
      />
      <input
        type="password"
        value={password}
        placeholder="password"
        onChange={(ev) => setPassword(ev.target.value)}
      />
      <button disabled={!username || !password}>Login</button>
      {error && <div>{error}</div>}
    </form>
  );
};

const Register = ({ register }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const submit = async (ev) => {
    ev.preventDefault();
    try {
      await register({ username, password });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <form onSubmit={submit}>
      <input
        value={username}
        placeholder="username"
        onChange={(ev) => setUsername(ev.target.value)}
      />
      <input
        type="password"
        value={password}
        placeholder="password"
        onChange={(ev) => setPassword(ev.target.value)}
      />
      <button disabled={!username || !password}>Register</button>
      {error && <div>{error}</div>}
    </form>
  );
};

function App() {
  const [auth, setAuth] = useState({});
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    attemptLoginWithToken();
  }, []);

  const attemptLoginWithToken = async () => {
    const token = window.localStorage.getItem("token");
    if (token) {
      const response = await fetch(`/api/auth/me`, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const json = await response.json();
        setAuth(json);
      } else {
        window.localStorage.removeItem("token");
      }
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const response = await fetch("/api/products");
      if (response.ok) {
        const json = await response.json();
        setProducts(json);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchFavorites = async () => {
      const token = window.localStorage.getItem("token");
      if (token) {
        const response = await fetch(`/api/users/${auth.id}/favorites`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const json = await response.json();
          setFavorites(json);
        }
      }
    };
    if (auth.id) {
      fetchFavorites();
    } else {
      setFavorites([]);
    }
  }, [auth]);

  const login = async (credentials) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const json = await response.json();
      window.localStorage.setItem("token", json.token);
      attemptLoginWithToken();
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  };

  const register = async (credentials) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(credentials),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const json = await response.json();
      window.localStorage.setItem("token", json.token);
      attemptLoginWithToken();
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  };

  const addFavorite = async (product_id) => {
    const response = await fetch(`/api/users/${auth.id}/favorites`, {
      method: "POST",
      body: JSON.stringify({ product_id }),
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${window.localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const json = await response.json();
      setFavorites([...favorites, json]);
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  };

  const removeFavorite = async (id) => {
    const response = await fetch(`/api/users/${auth.id}/favorites/${id}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${window.localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      setFavorites(favorites.filter((favorite) => favorite.id !== id));
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  };

  const logout = () => {
    window.localStorage.removeItem("token");
    setAuth({});
  };

  return (
    <>
      {!auth.id ? (
        <>
          <Login login={login} />
          <Register register={register} />
        </>
      ) : (
        <button onClick={logout}>Logout {auth.username}</button>
      )}
      <ul>
        {products.map((product) => {
          const isFavorite = favorites.find(
            (favorite) => favorite.product_id === product.id
          );
          return (
            <li key={product.id} className={isFavorite ? "favorite" : ""}>
              {product.name}
              {auth.id && isFavorite && (
                <button onClick={() => removeFavorite(isFavorite.id)}>-</button>
              )}
              {auth.id && !isFavorite && (
                <button onClick={() => addFavorite(product.id)}>+</button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default App;
