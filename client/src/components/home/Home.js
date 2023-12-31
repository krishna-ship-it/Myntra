import React, { useEffect } from "react";
import "react-responsive-carousel/lib/styles/carousel.min.css"; // requires a loader
import { useDispatch, useSelector } from "react-redux";
import ProductCard from "./../products/ProductCard";
import { getFeaturedProductsThunk } from "../../store/productsSlice";
import "./Home.css";
import Loader from "../Loader";
function Home() {
  const status = useSelector((state) => state.products?.status);
  const products = useSelector((state) => state?.products?.featuredProducts);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getFeaturedProductsThunk());
  }, [dispatch]);
  return (
    <div className="home">
      <div className="home_banner">
        <div className="home_banner_tagline">
          <h1 className="home_banner_tagline_text">
            Get Best Fashion Product.
            <br />
          </h1>
          <h1>Promise.</h1>
        </div>
      </div>
      {status === "LOADING" ? (
        <Loader />
      ) : (
        <>
          <h3 style={{ textAlign: "center", marginTop: "50px" }}>
            Featured Products
          </h3>
          <div className="home_products">
            {products?.map((product) => (
              <ProductCard product={product} key={product?._id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Home;
