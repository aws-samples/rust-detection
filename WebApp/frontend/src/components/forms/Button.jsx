// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button as ReactStrapButton} from "reactstrap";

import "./Button.scss";

export class Button extends Component {
  render() {
    const {color, children, onClick, ...rest} = this.props;
    return (
      <ReactStrapButton className="spd-button"
                        color={color}
                        onClick={onClick}
                        {...rest}
                        >
        {children}
      </ReactStrapButton>
    );
  }
}

Button.propTypes = {
  color : PropTypes.oneOf(['primary', 'secondary', 'link']),
  onClick : PropTypes.func,
};
