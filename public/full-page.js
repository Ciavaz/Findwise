(function () {
    const styleTag = `
        <style>
            .responsive-iframe-container {
                position: relative;
                width: 80%;
                height: 100%;
                overflow: hidden;
                margin: 0 auto; /* Center the container */
            }
            .responsive-iframe-container iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: 0;
            }
            @media (max-width: 768px) {
                .responsive-iframe-container {
                    width: 100%;
                }
            }
        </style>
    `;

    function createResponsiveIframe() {
        const iframeContainer = document.createElement("div");
        iframeContainer.className = "responsive-iframe-container container";
        iframeContainer.innerHTML = `
            <iframe src="https://findwise.vercel.app/" frameborder="0" allowfullscreen></iframe>
        `;

        

        document.head.insertAdjacentHTML("beforeend", styleTag);
        return iframeContainer;
    }

    window.createResponsiveIframe = createResponsiveIframe;
})();
