import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AwsCrmPreview from './AwsCrmPreview.jsx'

const preview=import.meta.env.VITE_AWS_CRM_PREVIEW==="true";
ReactDOM.createRoot(document.getElementById('root')).render(preview?<AwsCrmPreview/>:<App />)
