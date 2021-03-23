// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
export const getImageResource = (val) => {
  let imageResource = val;
  if (imageResource.startsWith('../assets')) {
    // Webpack cannot handle requiring dynamic image. We need to construct the parameter with path + suffix
    // See https://github.com/vuejs-templates/webpack/issues/126
    imageResource = require('../assets/' + val + '.png');
  }
  return imageResource;
};

export const mergeClassName = (componentClassNames, passedClassname) => {
  if (!passedClassname) {
    return componentClassNames;
  } else {
    return `${componentClassNames} ${passedClassname}`;
  }
};

