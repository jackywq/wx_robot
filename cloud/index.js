'use strict';

const HEADER_KEY = "x-github-event";

const actionWords = {
    "opened": "发起",
    "closed": "关闭",
    "reopened": "重新发起",
    "edited": "更新",
    "merge": "合并",
    "created": "创建",
    "requested": "请求",
    "completed": "完成",
    "synchronize": "同步更新"
};

const querystring = require('querystring');
const ChatRobot = require('./chat');
/**
 * 处理ping事件
 * @param ctx koa context
 * @param robotid 机器人id
 */
async function handlePing(body, robotid) {
    const robot = new ChatRobot(
        robotid
        );
        
    const { repository } = body;
    const msg = "成功收到了来自Github的Ping请求，项目名称：" + repository.name;
    await robot.sendTextMsg(msg);
    return msg;
}

/**
 * 处理push事件
 * @param ctx koa context
 * @param robotid 机器人id
 */
async function handlePush(body, robotid) {
    const robot = new ChatRobot(
        robotid
    );
    const { pusher, repository, commits, ref} = body;
    const user_name = pusher.name;
    const lastCommit = commits[0];
    const branchName = ref.replace("refs/heads/", "");

    const mdMsg = `项目 [${repository.name}](${repository.url}) 收到一次 \<font color= \"green\"\>push\</font\> 提交 \n
                    >提交者:  \<font color= \"yellow\"\>${user_name}\</font\>
                    >分支:  \<font color= \"commit\"\>${branchName}\</font\>
                    >最新提交信息: ${lastCommit.message}`;
    await robot.sendMdMsg(mdMsg);
    return mdMsg;
}

/**
 * 处理merge request事件
 * @param ctx koa context
 * @param robotid 机器人id
 */
async function handlePR(body, robotid) {
    const robot = new ChatRobot(
        robotid
    );
    const {action, sender, pull_request, repository} = body;
    const mdMsg = `${sender.login}在 [${repository.name}](${repository.html_url}) ${actionWords[action]}了PR \n
                    >标题：\<font color= \"red\"\>${pull_request.title}\</font\>
                    >源分支：${pull_request.head.ref}
                    >目标分支：${pull_request.base.ref}
                    >[查看PR详情](${pull_request.html_url})`;
    await robot.sendMdMsg(mdMsg);
    return mdMsg;
}

/**
 * 处理issue 事件
 * @param ctx koa context
 * @param robotid 机器人id
 */
async function handleIssue(body, robotid) {
    const robot = new ChatRobot(
        robotid
    );
    const { action, issue, repository } = body;
    if (action !== "opened") {
        return `除非有人开启新的issue，否则无需通知机器人`;
    }
    const mdMsg = `有人在 [${repository.name}](${repository.html_url}) ${actionWords[action]}了一个issue \n
                    >标题：${issue.title}
                    >发起人：[${issue.user.login}](${issue.user.html_url})
                    >[查看详情](${issue.html_url})`;
    await robot.sendMdMsg(mdMsg);
    return;
}

/**
 * 对于未处理的事件，统一走这里
 * @param ctx koa context
 * @param event 事件名
 */
function handleDefault(body, event) {
    return `Sorry，暂时还没有处理${event}事件`;
}

exports.main_handler = async (event) => {
    console.log('event: ', event);
    if (!(event.headers && event.headers[HEADER_KEY])) {
        return 'Not a github webhook deliver'
    }
    const gitEvent = event.headers[HEADER_KEY]
    const robotid = event.queryString.id
    const query = querystring.parse(event.body);
    const payload = JSON.parse(query.payload);

    switch (gitEvent) {
        case "push":
            return await handlePush(payload, robotid);
        case "pull_request":
            return await handlePR(payload, robotid);
        case "ping":
            return await handlePing(payload, robotid);
        case "issues":
            return await handleIssue(payload, robotid);
        default:
            return handleDefault(payload, gitEvent);
    }
};