// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Input, Label } from "reactstrap";

export class PasswordInput extends Component {
  render() {
    const {id, label, name, placeholder, ...rest} = this.props;
    return (
      <FormGroup {...rest}>
        {label && <Label for={id}>{label}</Label>}
        <Input type="password" id={id} name={name} placeholder={placeholder}/>
      </FormGroup>
    );
  }
}

PasswordInput.propTypes = {
  id : PropTypes.string,
  label : PropTypes.string,
  name : PropTypes.string,
  placeholder : PropTypes.string
};
