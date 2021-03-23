// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { CardDeck } from 'reactstrap';
import { CardItem } from './CardItem';

export class CardGrid extends Component {
  static DEFAULT_CARD_PER_ROW = 3;

  copyStyleWithFixedWidth = (existingStyle, width) => {
    return {
      ...existingStyle,
      flex: `0 0 ${width}px`
    }
  }

  render() {
    let gridContent = null;
    const {cards, cardPerRow, cardWidth, ...rest} = this.props;

    if(cardPerRow && cardWidth){
      console.error('You can specify only cardPerRow or cardWidth. Default to rendering cardWidth only');
    }

    if(cardWidth) {
      let cardItems = [];
      cards.forEach((card, index) => {

        let cardClassName = card.className || '';
        cardClassName += ' mb-4';

        const cardStyle = this.copyStyleWithFixedWidth(card.style, cardWidth);

        cardItems.push(
          <CardItem
            key={index}
            {...card}
            className={cardClassName}
            style={cardStyle}
          />
        )
      });
      gridContent = (
        <CardDeck {...rest}>
          {cardItems}
        </CardDeck>
      )
    } else {
      const perRow = cardPerRow || CardGrid.DEFAULT_CARD_PER_ROW;

      let rows = [];
      let currRow = -1;
      cards.forEach((card, index) => {
        if(index % perRow === 0){
          currRow += 1;
          rows.push([])
        }
        rows[currRow].push(
          <CardItem
            key={index}
            {...card}
          />
        )
      });

      // CardDeck will expand last row to full width. This will mess up the card width that is auto adjusted by flex layout.
      // We fill dummy CardItem element in the last row to ensure that we have the same number of item per row. So the widths of all cards are equal.
      // TODO: Better rewrite this with CSS Grid. This is too hacky.
      const lastRow = rows[currRow];
      while(lastRow.length < perRow){
        lastRow.push(<CardItem key={Math.random()} style={{visibility : "hidden"}}/>);
      }

      gridContent = rows.map((row, index) => {
        return (
          <CardDeck key={index} className="mb-4" {...rest}>
            {row}
          </CardDeck>
        )
      });

    }

    return (
      <div className="spd-cardgrid">
        {
          gridContent
        }
      </div>
    )

  }

}

CardGrid.propTypes = {
  cards : PropTypes.array,
  cardPerRow : PropTypes.number
};
