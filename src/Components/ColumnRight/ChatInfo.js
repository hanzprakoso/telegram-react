/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import withStyles from '@material-ui/core/styles/withStyles';
import ChatDetails from './ChatDetails';
import GroupsInCommon from './GroupsInCommon';
import SharedDocuments from './SharedMedia/SharedDocuments';
import SharedMedia from './SharedMedia';
import { borderStyle } from '../Theme';
import { getChatCounters } from '../../Actions/Chat';
import { getSupergroupId, isSupergroup } from '../../Utils/Chat';
import ApplicationStore from '../../Stores/ApplicationStore';
import ChatStore from '../../Stores/ChatStore';
import SupergroupStore from '../../Stores/SupergroupStore';
import TdLibController from '../../Controllers/TdLibController';
import './ChatInfo.css';

// const styles = (theme) => ({
//     borderColor: {
//         borderColor: theme.palette.divider
//     }
// });

class ChatInfo extends React.Component {
    constructor(props) {
        super(props);

        console.log('ChatDetails.ChatInfo.ctor');

        this.detailsRef = React.createRef();

        const { popup } = props;
        const { chatId, dialogChatId } = ApplicationStore;

        this.state = {
            chatId: popup ? dialogChatId : chatId,
            migratedChatId: 0,
            userChatId: null,
            openSharedMedia: false,
            openSharedDocuments: false,
            openGroupInCommon: false,
            counters: null,
            migratedCounters: null
        };
    }

    componentDidMount() {
        console.log('ChatDetails.ChatInfo.componentDidMount');
        this.loadContent(this.state.chatId);

        ApplicationStore.on('clientUpdateChatId', this.onClientUpdateChatId);
    }

    componentWillUnmount() {
        ApplicationStore.removeListener('clientUpdateChatId', this.onClientUpdateChatId);
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const { chatId } = this.state;
        if (chatId !== prevState.chatId) {
            this.loadContent(chatId);
        }
    }

    onClientUpdateChatId = update => {
        const { popup } = this.props;
        const { chatId } = this.state;

        if (popup) return;
        if (chatId === update.nextChatId) return;

        this.sharedDocuments = null;

        this.setState({
            chatId: update.nextChatId,
            migratedChatId: 0,
            userChatId: null,
            openSharedMedia: false,
            openSharedDocuments: false,
            openGroupInCommon: false,
            counters: ChatStore.getCounters(update.nextChatId),
            migratedCounters: null
        });
    };

    loadContent = chatId => {
        this.loadChatCounters(chatId);
        this.loadMigratedCounters(chatId);
    };

    loadChatCounters = async chatId => {
        const counters = await getChatCounters(chatId);
        ChatStore.setCounters(chatId, counters);

        if (chatId !== this.state.chatId) return;

        this.setState({ counters });
    };

    loadMigratedCounters = async chatId => {
        console.log('ChatInfo.loadMigratedCounters');
        if (!isSupergroup(chatId)) return;

        const fullInfo = SupergroupStore.getFullInfo(getSupergroupId(chatId));
        if (!fullInfo) return;

        const { upgraded_from_basic_group_id: basic_group_id } = fullInfo;
        if (!basic_group_id) return;

        const chat = await TdLibController.send({
            '@type': 'createBasicGroupChat',
            basic_group_id,
            force: true
        });

        if (!chat) return;

        console.log('ChatInfo.loadMigratedCounters chat', chat);
        const counters = await getChatCounters(chat.id);
        ChatStore.setCounters(chat.id, counters);

        if (this.state.chatId !== chatId) return;

        this.setState({ migratedChatId: chat.id, migratedCounters: ChatStore.getCounters(chat.id) });
    };

    handelOpenSharedMedia = () => {
        this.setState({ openSharedMedia: true });
    };

    handleCloseSharedMedia = () => {
        this.setState({ openSharedMedia: false });
    };

    handleOpenGroupInCommon = () => {
        this.setState({ openGroupInCommon: true });
    };

    handleCloseGroupsInCommon = () => {
        this.setState({ openGroupInCommon: false });
    };

    handleCloseChatDetails = () => {
        const { popup } = this.props;
        const { userChatId } = this.state;

        if (userChatId) {
            this.setState({ userChatId: null });
        } else if (popup) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateDialogChatId',
                chatId: 0
            });
        } else {
            ApplicationStore.changeChatDetailsVisibility(false);
        }
    };

    handleOpenSharedDocuments = () => {
        this.setState({ openSharedDocuments: true });
    };

    handleCloseSharedDocuments = () => {
        this.setState({ openSharedDocuments: false });
    };

    render() {
        console.log('ChatDetails.ChatInfo.render', this.state);
        const { classes, className, popup } = this.props;
        const {
            chatId,
            counters,
            migratedChatId,
            migratedCounters,
            userChatId,
            openSharedDocuments,
            openSharedMedia,
            openGroupInCommon
        } = this.state;

        const currentChatId = chatId || userChatId;
        const minHeight = this.detailsRef && this.detailsRef.current ? this.detailsRef.current.getContentHeight() : 0;

        let content = null;
        if (openSharedMedia) {
            content = (
                <SharedMedia
                    chatId={currentChatId}
                    popup={popup}
                    minHeight={minHeight}
                    onClose={this.handleCloseSharedMedia}
                />
            );
        } else if (openSharedDocuments) {
            this.sharedDocuments = this.sharedDocuments || (
                <SharedDocuments
                    chatId={currentChatId}
                    migratedChatId={migratedChatId}
                    popup={popup}
                    minHeight={minHeight}
                    onClose={this.handleCloseSharedDocuments}
                />
            );

            content = this.sharedDocuments;
        } else if (openGroupInCommon) {
            content = (
                <GroupsInCommon
                    chatId={currentChatId}
                    popup={popup}
                    minHeight={minHeight}
                    onClose={this.handleCloseGroupsInCommon}
                />
            );
        } else {
            content = (
                <ChatDetails
                    ref={this.detailsRef}
                    chatId={currentChatId}
                    popup={popup}
                    backButton={userChatId === chatId}
                    counters={counters}
                    migratedCounters={migratedCounters}
                    onOpenSharedMedia={this.handelOpenSharedMedia}
                    onOpenSharedDocument={this.handleOpenSharedDocuments}
                    onOpenGroupInCommon={this.handleOpenGroupInCommon}
                    onClose={this.handleCloseChatDetails}
                />
            );
        }

        return popup ? (
            <>{content}</>
        ) : (
            <div className={classNames(classes.borderColor, { 'right-column': !popup }, className)}>{content}</div>
        );
    }
}

ChatInfo.propTypes = {
    className: PropTypes.string,
    classes: PropTypes.object,
    popup: PropTypes.bool
};

ChatInfo.defaultProps = {
    className: null,
    classes: null,
    popup: false
};

export default withStyles(borderStyle)(ChatInfo);