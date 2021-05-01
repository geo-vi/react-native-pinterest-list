import React from 'react'
import {InteractionManager, View, FlatList} from "react-native";
import getLayoutParams from "./layout";

export const MASONRY_WINDOW_SIZE = 200;

export const MAXIMAL_SCALING_ASPECT_RATIO = 2; // 2:1 for maximal height

export const masonryResize = (containerWidth, columns, initialWidth, initialHeight) => {
    const itemWidth = containerWidth / columns;
    const itemHeightRange = [itemWidth, itemWidth * MAXIMAL_SCALING_ASPECT_RATIO];

    const ratio = initialHeight / initialWidth;
    if (ratio > 1) {
        let determinedHeightByRatio = itemWidth * ratio;
        if (determinedHeightByRatio > itemHeightRange[1]) {
            determinedHeightByRatio = itemHeightRange[1];
        }

        return {
            width: itemWidth,
            height: determinedHeightByRatio
        };
    } else { // 1:1 ratio
        return {
            width: itemWidth,
            height: itemHeightRange[0]
        };
    }
};

export default class PinterestList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            params: {
                items: [],
                containerWidth: props.containerWidth,
                containerHeight: 0
            },
            addedContainerHeight: 0
        }
    }

    componentDidMount() {
        this.calculateListInteraction();
    }

    componentWillUnmount() {
        this.interactions.cancel();
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        if (this.props !== nextProps) {
            this.calculateListInteraction();
            return false;
        }
        return true;
    }

    calculateListInteraction() {
        this.interactions = InteractionManager.runAfterInteractions( () => {
            const { data, containerWidth, columns } = this.props;

            const itemWidth = containerWidth / columns;

            const newData = this.calculateHeightData(data);

            if (newData.length > 0) {
                const params = getLayoutParams(newData, containerWidth, itemWidth);
                this.setState({data, params})
            }
            else {
                this.setState({data: [], params: { ...this.state.params, containerHeight: 0, items: []}})
            }
        });
    };

    calculateHeightData(data) {
        const newData = [];
        const { containerWidth, columns } = this.props;

        const itemExtraHeight = this.props.itemExtraHeight ?? 0;

        for (const instance of data) {
            const sizedData = masonryResize(containerWidth, columns, instance.width, instance.height);
            sizedData.height += itemExtraHeight;
            newData.push({...instance, ...sizedData});
        }
        return newData;
    }

    renderItem = (instance) => {
        const { item } = instance;
        const { renderItem, spacing } = this.props;
        const listSpacing = { horizontal: spacing, vertical: spacing };

        const itemChildStyle = {
            width: item.width - listSpacing.horizontal,
            height: item.height - listSpacing.vertical,
        };

        const itemStyle = [
            styles.listItem,
            {
                top: item.top,
                left: item.left,
                width: item.width,
                height: item.height,
            },
        ];

        return (
            <View style={[styles.listItem, itemStyle]}>
                <View style={itemChildStyle}>
                    {renderItem(instance, itemChildStyle)}
                </View>
            </View>
        )
    };

    onHeaderLayout = ({nativeEvent}) => {
        const {height} = nativeEvent.layout;
        const footerHeight = this.props.footerHeight || 0;
        this.setState({addedContainerHeight: height + footerHeight + 60})
    };

    render() {
        const { params, addedContainerHeight } = this.state;
        const { columns, scrollRef, ListHeaderComponent, ignoreHeaderMeasuring, ...rest } = this.props;

        let header = ListHeaderComponent;
        if (ListHeaderComponent && !ignoreHeaderMeasuring) {
            header = <View onLayout={this.onHeaderLayout}><ListHeaderComponent /></View>
        }

        return <FlatList
            {...rest}
            ref={scrollRef}
            data={params.items}
            windowSize={MASONRY_WINDOW_SIZE}
            keyExtractor={(item, index) => index.toString()}
            style={styles.listItemContainer}
            ListHeaderComponent={header}
            contentContainerStyle={{
                width: params.containerWidth,
                height: params.containerHeight + addedContainerHeight
            }}
            renderItem={this.renderItem}
        />;
    };
}

const styles = {
    listItemContainer: {
        position: 'relative',
    },
    listItem: {
        position: 'absolute',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
};
