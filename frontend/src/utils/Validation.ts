export const ValidationPatterns = {
    email: {
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        message: '올바른 이메일 형식이 아닙니다',
    },

    // 비밀번호 검증 - 일반 로그인용
    password: {
        pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
        message: '비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다',
    },

    // 이름 검증 - 회원가입용
    name: {
        pattern: /^[가-힣a-zA-Z]{2,10}$/,
        message: '이름은 2-10자의 한글 또는 영문이어야 합니다',
    },
};

export const validateField = (
    type: keyof typeof ValidationPatterns,
    value: string
): string => {
    const validation = ValidationPatterns[type];
    if (!validation.pattern.test(value)) {
        return validation.message;
    }
    return '';
};

export const validateForm = (
    formData: Record<string, string>,
    fields: Array<keyof typeof ValidationPatterns>
): Record<string, string> => {
    const errors: Record<string, string> = {};

    fields.forEach((field) => {
        const fieldError = validateField(field, formData[field]);
        if (fieldError) {
            errors[field] = fieldError;
        }
    });
    return errors;
};
