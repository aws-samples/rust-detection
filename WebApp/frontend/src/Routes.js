// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from "react";
import { Route, Switch } from "react-router-dom";
import Home from "./containers/Home";

import NotFound from "./containers/NotFound";
import Login from "./containers/Login";
import ModelRetraining from "./containers/ModelRetraining";
import BatchUpload from "./containers/BatchUpload";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute";

export default ({ childProps }) =>
  <Switch>
    <Route path="/" exact component={Home} props={childProps}/>
    <UnauthenticatedRoute path="/login" exact component={Login} props={childProps}/>    
    <Route path="/ModelRetraining" exact component={ModelRetraining} props={childProps}/>
    <Route path="/BatchUpload" exact component={BatchUpload} props={childProps}/>
    
    { /* Finally, catch all unmatched routes */ }
    <Route component={NotFound} />
  </Switch>;
