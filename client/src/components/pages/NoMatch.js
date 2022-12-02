import { useEffect } from 'react';
//import { Helmet } from "react-helmet-async";
// import './NoMatch.css';

const NoMatch = ({AppName, AppUrl, setCurrentPage}) => {

    useEffect(() => {
		setCurrentPage('error');
	}, [setCurrentPage]);

    return (
        <>
           {/* <Helmet>
                <title>{AppName + ' - 404'}</title>
                <meta name="description" content={AppName + ' - 404'} />
                <meta name="keywords" content={AppName} />
                <meta property="og:title" content={AppName + ' - 404'} />
                <meta property="og:url" content={AppUrl + ' - 404'} />
                <meta property="og:description" content={AppName + ' - 404'} />
                <link rel="canonical" href={AppUrl} />
            </Helmet> */}

            <div className="error-page">
                <h1 className="error-page-title">404</h1>
                <h2 className="error-page-text">Page not found</h2>
            </div>
        </>
    )
}

export default NoMatch