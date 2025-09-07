const state = {
    type: null,
    message: null,
    fieldError: null,
    validationErrors: null
};

const actions = {
    success({ commit }, message) {
        commit('success', message);
    },
    error({ commit }, message) {
        commit('error', message);
    },
    fieldError({ commit }, fieldError) {
        commit('fieldError', fieldError);
    },
    validationErrors({ commit }, errors) {
        commit('validationErrors', errors);
    },
    clear({ commit }) {
        commit('clear');
    }
};

const mutations = {
    success(state, message) {
        state.type = 'alert-success';
        state.message = message;
        state.fieldError = null;
        state.validationErrors = null;
    },
    error(state, message) {
        state.type = 'alert-danger';
        state.message = message;
        // Keep fieldError when showing general error
        // state.fieldError = null;
        state.validationErrors = null;
    },
    fieldError(state, fieldError) {
        state.fieldError = fieldError;
        // Don't clear general message when setting field error
    },
    validationErrors(state, errors) {
        state.validationErrors = errors;
    },
    clear(state) {
        state.type = null;
        state.message = null;
        state.fieldError = null;
        state.validationErrors = null;
    }
};

export const alert = {
    namespaced: true,
    state,
    actions,
    mutations
};
