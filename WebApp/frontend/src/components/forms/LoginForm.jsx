// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from "react";
import PropTypes from "prop-types";

import { LoaderButton } from "./LoaderButton";
import "./LoginForm.scss";

import { Form, FormGroup, Input, Label } from "reactstrap";

export class LoginForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      username : "",
      password : ""
    };
  }

  validateForm() {
    return this.state.username.length > 0 && this.state.password.length > 0;
  }

  handleChange = event => {
    this.setState({
      [event.target.id] : event.target.value
    });
  };

  handleSubmit = event => {
    event.preventDefault();

    const {onSubmit} = this.props;
    onSubmit(this.state.username, this.state.password);
  };

  render() {

    return (
      <Form onSubmit={this.handleSubmit} className="login-form">
        <FormGroup>
          <Label for="username">Username</Label>
          <Input type="string" name="username" id="username" placeholder="Username"
                 onChange={this.handleChange}/>
        </FormGroup>
        <FormGroup>
          <Label for="password">Password</Label>
          <Input type="password" name="password" id="password" placeholder="Password"
                 onChange={this.handleChange}/>
        </FormGroup>
        <LoaderButton
          text="Login"
          isLoading={this.props.isLoading}
          loadingText="Logging in…"
          disabled={!this.validateForm()}
          block
        />
      </Form>
    );
  }
}

LoginForm.propTypes = {
  isLoading : PropTypes.bool,
  onSubmit : PropTypes.func
};

