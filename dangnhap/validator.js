// HTML DOM


//1.Element
//2.Atrribute
//3.Text

function Validator(options) {

    function getParent(element, selector){
        while (element.parentElement){
            if (element.parentElement.matches(selector)) {
                return element.parentElement;
            }
            element = element.parentElement;
        }
    }

    var selectorRules = {};

    function validate(inputElement, rule) {
        var errorElement = getParent(inputElement, options.formGroupSelector).querySelector(options.errorSelector);
        var errorMessage;
        //lẩy ra các rules của selector
        var rules = selectorRules[rule.selector];
        //lặp qua từng rule & kiểm tra
        //nếu có lỗi thì dừng việc kiểm tra
        for (var i = 0; i < rules.length; ++i) {
            switch (inputElement.type){
                case 'radio':
                case 'checkbox':
                    errorMessage = rules[i](
                        formElement.querySelector(rule.selector + ':checked')
                    );
                    break;
                default:
                    errorMessage = rules[i](inputElement.value);
            }
            
            if (errorMessage) break;
        }

        if (errorMessage) {
            errorElement.innerText = errorMessage;
             getParent(inputElement, options.formGroupSelector).classList.add('invalid');
        } else {
            errorElement.innerText = '';
             getParent(inputElement, options.formGroupSelector).classList.remove('invalid');
        }

        return !errorMessage;
    }
    //lấy element của form cần validate
    var formElement = document.querySelector(options.form);
    if (formElement) {
        formElement.onsubmit = function (e) {
            e.preventDefault();

            var isFormValid = true;

            options.rules.forEach(function (rule) {
                var inputElement = formElement.querySelector(rule.selector);
                var isValid = validate(inputElement, rule);
                if (!isValid) {
                    isFormValid = false;
                }
            });

            if (isFormValid) {
                //Trường hợp submid với JS
                if (typeof options.onSubmit === 'function') {

                    var enableInputs = formElement.querySelectorAll('[name]');
                    var formValues = Array.from(enableInputs).reduce(function (values, input) {
                        (values[input.name] = input.value) 
                        return values;
                    }, {});
                    options.onSubmit(formValues);
                }
                // Trường hợp submid với hành vi mặc định
            
            // else {
            //     formElement.submit();

            }
        }




        //lặp qua mỗi rule và xử lý (lắng nghe sự kiện blur , input,...)
        options.rules.forEach(function (rule) {
            // lưu lại các rules cho mỗi input
            if (Array.isArray(selectorRules[rule.selector])) {
                selectorRules[rule.selector].push(rule.test);
            } else {
                selectorRules[rule.selector] = [rule.test];
            }

            var inputElement = formElement.querySelector(rule.selector);

            if (inputElement) {
                //xử lý trường hợp blur khỏi input
                inputElement.onblur = function () {
                    validate(inputElement, rule);
                }

                // xử lý môi khi người dùng nhập
                inputElement.oninput = function () {
                    var errorElement =  getParent(inputElement, options.formGroupSelector).querySelector(options.errorSelector);
                    errorElement.innerText = '';
                     getParent(inputElement, options.formGroupSelector).classList.remove('invalid');
                }

            }
        });
    }
}

Validator.isRequired = function (selector, message) {
    return {
        selector: selector,
        test: function (value) {
            return value.trim() ? undefined : message || 'Vui lòng nhập lại mật khẩu';
        }
    };

}

Validator.isEmail = function (selector, message) {
    return {
        selector: selector,
        test: function (value) {
            var regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
            return regex.test(value) ? undefined : message || 'Trường này phải là email';
        }
    };
}
Validator.minLength = function (selector, min, message) {
    return {
        selector: selector,
        test: function (value) {
            return value.length >= min ? undefined : message || `Vui lòng nhập đủ ${min} kí tự`;
        }
    };

}

Validator.isConfirmed = function (selector, getConfirmValue, message) {
    return {
        selector: selector,
        test: function (value) {
            return value === getConfirmValue() ? undefined : message || 'Giá trị nhập vào không chính xác';
        }

    };
}

Validator({
    form: '#form-1',
    formGroupSelector: '.form-group',
    errorSelector: '.form-message',
    rules: [
        Validator.isRequired('#email'),
        Validator.isEmail('#email'),
        Validator.minLength('#password', 6),
    ],
    // KHI BẤM NÚT ĐĂNG NHẬP
    onSubmit: async function (data) {
        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: data.username,
                    password: data.password
                })
            });

            const result = await response.json();

            if (response.ok) {
                // LƯU USER ĐANG ĐĂNG NHẬP VÀO BỘ NHỚ TRÌNH DUYỆT
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                
                alert(`Xin chào ${result.user.fullname}!`);
                window.location.href = '../profile/index.html'; // Chuyển hướng sang Profile
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert('Không thể kết nối tới Server Backend!');
        }
    }
});