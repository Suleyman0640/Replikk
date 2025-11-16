import React from 'react';

function UserLogin({ userName, onChangeUserName, onSubmit }) {
  return (
    <div className="full-screen-center">
      <div className="login-card">
        <div className="login-header">
          <div className="login-title">R E P L I K K</div>
          <div className="login-subtitle">Arkadaşlarınla sesli ve yazılı sohbet</div>
        </div>
        <div className="login-body">
          <input
            className="text-input"
            type="text"
            placeholder="Kullanıcı adını gir"
            value={userName}
            onChange={(e) => onChangeUserName(e.target.value)}
          />
          <button
            className="primary-button"
            type="button"
            onClick={onSubmit}
            disabled={userName.trim().length === 0}
          >
            Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserLogin;


