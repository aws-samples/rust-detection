// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Input, Label } from "reactstrap";

export class Checkboxes extends Component {
  render() {
    const {label, choices, ...rest} = this.props;
    return (
      <div {...rest}>
        {label && <Label>{label}</Label>}
        {choices.map(obj =>
          <FormGroup check key={obj.id}>
            <Label check key={obj.id}>
              <Input type="checkbox" id={obj.id} onChange={obj.onChange}/>
              {obj.label}
            </Label>
          </FormGroup>
        )}
      </div>
    );
  }
}

Checkboxes.propTypes = {
  label : PropTypes.string,
  choices : PropTypes.array,
};
