//index.js
//获取应用实例
var app = getApp()
const taxRules = [
  // 应纳税所得额 = 薪资 - 社保个人部分 - 5000
  { min: 0, max: 3000, rate: 0.03, deduction: 0 },          // 0~3000元部分
  { min: 3000, max: 12000, rate: 0.10, deduction: 210 },     // 3000~12000元部分
  { min: 12000, max: 25000, rate: 0.20, deduction: 1410 },    // 12000~25000元部分
  { min: 25000, max: 35000, rate: 0.25, deduction: 2660 },   // 25000~35000元部分
  { min: 35000, max: 55000, rate: 0.30, deduction: 4410 },    // 35000~55000元部分
  { min: 55000, max: 80000, rate: 0.35, deduction: 7160 },    // 55000~80000元部分
  { min: 80000, rate: 0.45, deduction: 15160 }                // 超过80000元部分
];

Page({
  data: {
    insuranceTypes: [
      { 
        name: '五险一金',
        items: [
          { id: 1, category: "养老", private_percentage: 8, company_percentage: 22 },
          { id: 2, category: "医疗", private_percentage: 2, company_percentage: 12 },
          { id: 3, category: "失业", private_percentage: 1, company_percentage: 1.7 },
          { id: 4, category: "工伤", private_percentage: 0, company_percentage: 0.5 },
          { id: 5, category: "生育", private_percentage: 0, company_percentage: 0.8 },
          { id: 6, category: "公积金", private_percentage: 7, company_percentage: 7 }
        ]
      },
      { 
        name: '六险一金',
        items: [
          { id: 7, category: "养老", private_percentage: 8, company_percentage: 22 },
          { id: 8, category: "医疗", private_percentage: 2, company_percentage: 12 },
          { id: 9, category: "补充医疗", private_percentage: 0, company_percentage: 2 },
          { id: 10, category: "失业", private_percentage: 1, company_percentage: 1.7 },
          { id: 11, category: "工伤", private_percentage: 0, company_percentage: 0.5 },
          { id: 12, category: "生育", private_percentage: 0, company_percentage: 0.8 },
          { id: 13, category: "公积金", private_percentage: 7, company_percentage: 7 }
        ]
      }
    ],
    range: ['五险一金', '六险一金'],
    selectedInsuranceType: 0,
    cityRules: {
      '上海': { min: 7310, max: 36549 },
      '北京': { min: 6326, max: 33891 },
      '广州': { min: 5284, max: 30876 },
      '深圳': { min: 2360, max: 38892 }
    },
    motto: 'Hello World',
    inputValue: '',
    userInfo: {},
    focus: false,
    index: 1,
    salary: 0,
    array: ['上海', '北京', '广州', '深圳'],
    tax: 0,
    actualSalary: 0
  },

  // 城市选择
  bindPickerChange(e) {
    this.setData({ 
      index: e.detail.value 
    }, () => this.total());
  },
  
// 处理比例修改
  onPercentageChange(e) {
    const { type, id } = e.currentTarget.dataset; // 获取是个人还是单位比例
    const value = Math.max(0, Math.min(100, e.detail.value || 0)); // 限制0-100
    
    // 查找对应的保险项
    const insuranceType = this.data.insuranceTypes[this.data.selectedInsuranceType];
    const itemIndex = insuranceType.items.findIndex(item => item.id === id);
    
    // 更新数据
    const keyPath = `insuranceTypes[${this.data.selectedInsuranceType}].items[${itemIndex}].${type}_percentage`;
    this.setData({
      [keyPath]: Number(value)
    }, () => {
      this.total();
      this.calculateFinal();
    });
  },

  // 保险类型选择
  onInsuranceTypeChange(e) {
    this.setData({
      selectedInsuranceType: e.detail.value
    }, () => this.total());
  },

  // 个人比例修改
  onPrivatePercentageChange(e) {
    const index = e.currentTarget.dataset.index;
    const value = Math.max(0, Number(e.detail.value) || 0);
    this.setData({
      [`insuranceTypes[${this.data.selectedInsuranceType}].items[${index}].private_percentage`]: value
    }, () => {
      this.total();
      this.calculateFinal();
    });
  },

  // 页面加载
  onLoad: function () {
    console.log('onLoad', this.data);
    this.total();
  },

  // 输入处理（强化校验）
  bindKeyInput: function(e) {
    const value = e.detail.value;
    if (/^(\d+)?(\.\d{0,2})?$/.test(value)) {
      this.setData({ 
        inputValue: value.replace(/(\.\d{2})\d+/, '$1')
      });
    }
  },

  // 开始计算
  startCount: function() {
    const rawInput = this.data.inputValue.trim();
    const city = this.data.array[this.data.index];
    
    // 空值校验
    // if (!rawInput) {
    //   this.modalView('输入不能含有空格！');
    //   return;
    // }

    // 数字校验
    const inputValue = parseFloat(rawInput);
    if (isNaN(inputValue)) {
      this.modalView('请输入有效数字（示例：8000 或 12345.67）');
      return;
    }

    // 正数校验
    if (inputValue <= 0) {
      this.modalView('薪资需大于0元');
      return;
    }

    // 更新数据
    this.setData({
      salary: inputValue,
      focus: false,
    }, () => {
      this.total();
      this.calculateFinal();
    });
  },

  // 最终计算结果
  calculateFinal: function() {
    const tax = this.calculateTax();
    const actualSalary = (this.data.salary - this.data.private_total - tax).toFixed(2);
    
    if (actualSalary < 0) {
      this.modalView('异常：税后收入负数，请检查输入');
      return;
    }

    this.setData({
      tax: parseFloat(tax),
      actualSalary: parseFloat(actualSalary)
    });
  },

  // 社保计算核心
  total: function () {
    const city = this.data.array[this.data.index];
    const { min, max } = this.data.cityRules[city];
    const userSalary = this.data.salary;

    // 自动修正基数
    const socialInsuranceBase = Math.min(Math.max(userSalary, min), max);

    // 计算社保金额
    const items = this.data.insuranceTypes[this.data.selectedInsuranceType].items;
    let privateTotal = 0, companyTotal = 0;
    
    items.forEach(item => {
      privateTotal += socialInsuranceBase * (item.private_percentage / 100);
      companyTotal += socialInsuranceBase * (item.company_percentage / 100);
    });

    this.setData({
      private_total: Number(privateTotal.toFixed(2)),
      company_total: Number(companyTotal.toFixed(2))
    });
  },

  // 个税计算
  calculateTax: function() {
    const { salary, private_total } = this.data;
    const threshold = 5000;
    const taxableIncome = salary - private_total - threshold;

    if (taxableIncome <= 0) return 0;

    const rule = taxRules.find(r => 
      taxableIncome > r.min && 
      (taxableIncome <= (r.max || Infinity))
    );
    
    return parseFloat((taxableIncome * rule.rate - rule.deduction).toFixed(2));
  },

  // 弹窗提示
  modalView: function(text) {
    wx.showModal({
      title: '提示',
      content: text,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 重置数据
  resetData: function() {
    this.setData({
      salary: 0,
      inputValue: "",
      focus: true,
      tax: 0,
      actualSalary: 0
    });
  },

  // 日志跳转（保留原始功能）
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    });
  }
});