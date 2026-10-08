import React, { useState } from 'react';

function Modal() {
  const [isOpen, setIsOpen] = useState(true);

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    isOpen && (
      <div className="modal">
        <div className="modal-content">
          <span className="close" onClick={closeModal}>
            &times;
          </span>
          <p>Esse site está em construção. Qualquer elemento nele ou procedimento de compra não será registrado ou processado. As informações contidas nele até o lançamento são apenas para testes da plataforma. Agradecemos a compreensão!</p>
        </div>
      </div>
    )
  );
}

export default Modal;