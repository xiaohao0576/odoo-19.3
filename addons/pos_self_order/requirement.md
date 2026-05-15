# Odoo POS Self Order改造

## 需求描述
当前Odoo POS self Order模块，不能满足中国餐厅平板点餐的需求。在中餐的场景下，这个模块用着很别扭。因为这个模块，就只是为了麦当劳、肯德基那种店的应用场景开发的，根本没有考虑到中餐的需求。

### 当前模块的局限性

pos_self_order模块有几种不同的模块，我逐个分析给你，告诉你为什么都不适合中餐厅

1. QR menu 模式
这种模式 只允许看菜单，不能下单，就是一个电子版本的菜单。 中餐需要客户自己下单，所以这种模式不适合

2. Kiosk模式
这种模式下，是让客人使用店里的自助下单机去下单，然后输入一个牌号，或者电子叫号器，点餐内容不会记录到桌号上。  
对于中餐客人，坐到包厢里了，不可能再站起来，到门口的自助机去下单的。
就算把平板电脑变成kiosk模式，让客人下单，第二次下单的菜品和第一次下单的菜品，也不会汇总到一个桌子上，结账的时候又会很麻烦

3. QR Menu + Ordering模式， Service at table , pay after meal
这种模式，看起来是最接近中餐的需求，但这种模式，Odoo是设计给客人用自己的手机扫码下单的。
对于中餐厅，是餐厅准备几台平板电脑，让客人使用餐厅的平板去下单
这样的场景下，平板会交替给多个桌台服务， Odoo在浏览器中的indexDB数据库就会混乱，把桌子1的菜加上桌子2上。
Odoo没有考虑到一台设备同时服务多个桌台的情景

这个功能当前还有一个问题， 下单后，厨房不会出单，前台收银机，也无法打再打印订单给厨房，这是纯Bug

### 我需要的平板下单功能
上面说了，当前的self order模式都不适合中餐厅，那我说下中餐厅需要的平板下单的功能

1. 一台平板，可以同时为多个桌台下单，保证桌台之间的订单数据不会相互污染

2. 客人在平板上只能选菜，加菜，无法删除更改之前已经下单的菜品，也不需要查看之前的历史订单

3. 客人选好菜之后，加到购物车，但不允许自己下单，需要叫服务员，让服务员输入密码后，由服务员来最终确认下单

4. 平板上下单后成功后，厨房打印机可以出分单、前台出划菜单

5. 同一个桌台，下单的菜品需要合并到桌台的当前订单里，而不是单独再创建一个新的订单。也就是说，无论客人中间加过几次菜，最后结账的时候，都是在一个单子上结账

## 技术实现思路
我计划通过直接去更新`pos_self_order`模块的代码，来实现的我需求

### 代码修改原则
1. 对于`pos_self_order`模块的代码，可以直接在源文件上修改
2. 不修改其它模块的代码，比如如果需要`point_of_sale`和`pos_restaurant`模块的功能，就使用Odoo继承扩展的方法，在`pos_self_order`中增加代码
3. 就算是在`pos_self_order`模块中修改代码，也尽量不要破坏原有的功能代码，可以通过增加字段，然后增加if判断分支的方法来增加功能

### 注重代码复用
对于前端JS界面的展示，应该优先使用Odoo中已有的组件，目录如下
1. `addons/point_of_sale/static/src/app/components/` 
2. `addons/pos_restaurant/static/src/app/components` 
3. `addons/pos_self_order/static/src/app/components`

你应该阅读以上三个文件夹下的组件，理解它们的功能和作用， 在需要的时候，优先使用已有的组件，而不是重复造轮子

## 需要修改和增加的功能

### 增加x_device_type类型参数
文件名 `addons/pos_self_order/controllers/self_entry.py`，是pos self order的入口，用户在浏览器输入网址，或者扫码打开网页后，第一个访问的函数是 `start_self_ordering`。 我需要改造这个路由，需求如下
1. 增加一个url查询参数，名字是 `x_device_type` ，现在的取值有两种情况，`tablet` 和 空值。我用x_开头，代表这个是我自定义的字段， `tablet`表示是用平板电脑在下单
2. 从网址的查询参数中，如果读到了`x_device_type`参数，就写到`data`字典中，写到 `'self_ordering_mode': pos_configself_ordering_mode,`后面
3. 在`addons/pos_self_order/static/src/app/services/data_service.js`中，通过`session.data.x_device_type`取出网址参数中的值
4. 在`addons/pos_self_order/static/src/app/services/self_order_service.js`中，再通过 this.data 这种方式，把`x_device_type`设置成self_order service的一个属性，方便以后直接通过 `this.selfOrder.x_device_type`去直接读取
5. 如果代码中没有直接使用`x_device_type`,但是和我们这次定制开发功能有关的函数，在备注中增加`x_device_type`，便于以后进行全文搜索

以后对pos_self_order模块的功能增加，都是通过增加`this.selfOrder.x_device_type === “tablet”`分支去修改功能，尽量不要删除或修改已有的代码

### 不使用IndexedDB
* 需要修改的文件： `addons/pos_self_order/static/src/app/services/data_service.js`
* 默认情况，如果`self_ordering_mode === "mobile"`,  PosData就会在浏览器创建IndexedDB，但如果`x_device_type === “tablet”`时， 就不需要创建IndexedDB。
* 增加判断代码的函数： 所有带 session.data.self_ordering_mode === "mobile" 判断的，和indexedDB操作有关的

### 数据初始化的修改
文件： `addons/pos_self_order/static/src/app/services/self_order_service.js`

```
        if (this.config.self_ordering_mode === "kiosk") {
            await this.initKioskData();
        } else {
            await this.initMobileData();
        }
```
对于这段代码，如果`x_device_type === “tablet”`成立，执行 initKioskData， 而不是 initMobileData。 

### 进入landing_page的时候就清除上一单数据
文件： addons/pos_self_order/static/src/app/pages/landing_page/landing_page.js
函数： onWillStart

修改if条件判断为
            if (this.selfOrder.config.self_ordering_mode === "kiosk" || this.selfOrder.x_device_type === "tablet") {

也就是说，在 x_device_type = "tablet"的时候，也要像kiosk一样，清除上一单的数据

### 创建打印机检测函数和连通状态属性
文件： `addons/pos_self_order/static/src/app/services/pos_ticket_printer_service.js`
这个文件是扩展`point_of_sale`模块中的pos_ticket_printer_service，我需要增加一个打印机检测的函数，目的是检测当前正在下单的设备，能不能直接连通厨房和前台的打印机
* 增加一个名称为pingPrinters的函数, 逻辑如下：

1. 通过 printers 属性，取出系统中的前台打印机和后厨打印机

```
    get printers() {
        return [...this.preparationPrinters, ...this.receiptPrinters];
    }
```

2. 取出每台打印机的`printer_ip`和`use_lna`字段。
3. 根据`use_lna`确定协议， const protocol = this.use_lna ? "http:" : "https:";
4. 只取出`printer_ip`的域名和端口号部分（如果有端口号）
5. 最终的地址是 http://ip:port/ping 或 https://ip:port/ping
6. 对于多台打印机的 ping检测地址相同的情况，需要去重，只检测一次就行
7. 对去重后的地址进行连通性测试，用post方法，超时时间设置为2秒。如果正常，会得到http 200和 `pong`的文本回复
8. 如果超时或者连接不上或连接错误，那就返回相应的异常。异常类型应该是 ConnectionLostError from "@web/core/network/rpc"。这个异常类型里面可以放消息和data

### 修改process_order web controller
文件： addons/pos_self_order/controllers/orders.py
这个文件中，有一个原生的controller，代码如下
```
    @http.route("/pos-self-order/process-order/<device_type>/", auth="public", type="jsonrpc", website=True)
    def process_order(self, order, access_token, table_identifier, device_type):
```
现在我需要修改它，多一个参数 x_device_type：
```
    @http.route("/pos-self-order/process-order/<device_type>/", auth="public", type="jsonrpc", website=True)
    def process_order(self, order, access_token, table_identifier, device_type, x_device_type = None):
        pos_config, table = self._verify_authorization(access_token, table_identifier, order)
        if not pos_config.self_ordering_mode == device_type:
            raise Unauthorized("Invalid device type")

        # Create a safe copy of the order with only the necessary fields for order creation to
        # avoid potential security issues and to reduce the payload size
        safe_data = pos_config.env['pos.order']._check_pos_order(pos_config, order, device_type, table)

        # 下面这行代码，需要有分支了，判断x_device_type
        if x_device_type == 'tablet':
            results = pos_config.env['pos.order'].sudo().with_company(pos_config.company_id.id).x_sync_from_ui([safe_data])
            # x_sync_from_ui是自定义函数，属于pos.order这个模块
        else:
            results = pos_config.env['pos.order'].sudo().with_company(pos_config.company_id.id).sync_from_ui([safe_data])

        order_ids = pos_config.env['pos.order'].browse([order['id'] for order in results['pos.order']])

        # 下面的代码都一样了

```

### 新增 x_sync_from_ui 函数
文件： addons/pos_self_order/models/pos_order.py
在这个文件中，新增一个完全自定义的 `x_sync_from_ui` 函数，需求如下

* 返回值的类型，要和 原始的sync_from_ui兼容
* 这个函数，从收到的[safe_data]参数，提取`self_ordering_table_id`
* 从当前的 pos.order中，搜索 table_id = self_ordering_table_id ,并且状态是草稿的订单。 注意，我用的是table_id，就是实际的桌台
* 如果能找到符合条件的pos.order，取第一个订单，然后把 safe_data 中的订单行增加到找到的订单里面
* 如果找不到符合条件的pos.order，根据safe_data提供的信息，创建一个pos.order，记住要把table_id赋值为self_ordering_table_id。因为safe_data中只有self_ordering_table_id，没有table_id
* 无论是新创建订单，还是更新已有的订单，都需要读取safe_data中的`last_order_preparation_change`字段，把里面的订单行的内容合并到目标订单中，同时不要忘记更新last_order_preparation_change["metadata"]["serverDate"]字段到当前时间，防止被旧数据覆盖
* 最后，调用 self._send_notification(order_ids)函数，把订单的变动通知到前端POS收银机
* 如果这个函数的逻辑太复杂，你也可以创建新的辅助函数出来

### CartPage下单逻辑的更改
文件： addons/pos_self_order/static/src/app/pages/cart_page/cart_page.js
原函数名称： async pay()
* 我需要直接在这个函数中增加一个分支，从函数第一行就判断 this.selfOrder.x_device_type是否等于 tablet，如果不等于，按原逻辑运行
* 如果this.selfOrder.x_device_type === 'tablet'，那就在向下运行前，先运行我们新加的JS函数,需求如下

1. 弹出一个数字输入框，标题是请输入员工密码，可以使用现有的组件`NumberPopup` ,await makeAwaitable，等待服务员去输入密码，否则无法向下运行
2. 取到密码后，做密码正确性对比，这一部分我还没想好，先固定和 123123 这六个数字做对比，如果一样，就是密码正确，如果不一样，就再次弹出等待输入
3. 退出我们的自定义函数，继续原来的pay()函数，也就是会调用 this.selfOrder.confirmOrder()函数

### 新增函数 sendNewOrderToServer
文件： addons/pos_self_order/static/src/app/services/self_order_service.js

类比 sendDraftOrderToServer 这个函数，我们新建一个自己的函数，名称 sendNewOrderToServer，要求如下：
* 不用检查 this.currentOrder.changes
* 使用try catch 语句
* 发送订单数据时，增加上 x_device_type参数      
```     
const data = await rpc(
                `/pos-self-order/process-order/${this.config.self_ordering_mode}`,
                {
                    order: this.currentOrder.serializeForORM(),
                    access_token: this.access_token,
                    table_identifier: tableIdentifier,
                    x_device_type: this.x_device_type
                }
            );
```
* 收到回复后，执行const result = this.models.connectNewData(data);
* 如果有订单，正常情况就返回 return this.models["pos.order"].getBy("uuid", uuid);
* 如果有异常，就this.handleErrorNotification(error, [order.access_token]);显示错误

### 修改confirm函数
文件: addons/pos_self_order/static/src/app/services/self_order_service.js
原始函数： async confirmOrder()
修改需求如下：
* 在最开始就判断 x_device_type === "tablet"，如果为真，执行下面的操作，如果为假，就按原流程走
* 调用pos_ticket_printer的pingPrinters 函数，去测试一下厨房准备打印机的连通性
* 如果测试结果是打印机不通，就弹出界面提示用户，现在网络不通，无法发送小票到厨房，请到收银台手动下单。 可以用 handleErrorNotification 函数来弹出通知，里面有调用 NetworkConnectionLostPopup 这个弹窗
* 用户在网络异常的弹窗点击确认后，就返回到cartPage页面
* 如果测试结果是打印机正常，可以连通，那就调用 sendNewOrderToServer
* 如果一切正常，导航到this.confirmationPage("order", device, order.access_token);
