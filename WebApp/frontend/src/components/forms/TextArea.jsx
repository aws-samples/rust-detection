// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Input, Label } from "reactstrap";

export class TextArea extends Component {
  static DEFAULT_ROW_NO = 4;

  render() {
    const {id, label, name, placeholder, rows, onChange, ...rest} = this.props;
    return (
      <FormGroup {...rest}>
        {label && <Label for={id}>{label}</Label>}
        <Input type="textarea" id={id} name={name} placeholder={placeholder} onChange={onChange}
               rows={rows || TextArea.DEFAULT_ROW_NO}/>
      </FormGroup>
    );
  }
}

TextArea.propTypes = {
  id : PropTypes.string,
  label : PropTypes.string,
  name : PropTypes.string,
  placeholder : PropTypes.string,
  rows : PropTypes.number,
  onChange : PropTypes.func
};
