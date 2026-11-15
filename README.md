# ¿Cuelgo la ropa hoy?

[![Sitio en vivo](https://img.shields.io/badge/sitio-en%20vivo-6b46c1)](https://cuelgolaropa.ar)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**¿Hoy es un buen día para colgar la ropa a secar?** Sitio web gratuito
que responde con una sola palabra gigante — **SÍ** o **NO** — según el
clima de tu ubicación en este momento. Sin login, sin cuentas, sin
configuración.

## Usarlo

No hay que instalar nada — es una página web. Entrá directo a:

### 👉 [cuelgolaropa.ar](https://cuelgolaropa.ar)

Te va a pedir tu ubicación (o podés escribir tu ciudad a mano) y te
muestra la respuesta en grande, con el motivo y el pronóstico de las
próximas horas. Funciona igual en el celular que en la computadora, y
está disponible en español e inglés.

## Preguntas frecuentes

**¿Necesito crear una cuenta?**
No, no hay cuentas, ni login, ni nada parecido.

**¿Manda mis datos a algún lado?**
Solo lo justo para responder, y no se guarda. El sitio no tiene base de
datos ni cookies: lo único que queda en tu navegador es el idioma que
elegiste.

Para responder, el sitio consulta dos servicios externos:

- **[Open-Meteo](https://open-meteo.com/)** recibe las coordenadas de tu
  ubicación, redondeadas a ~1 km, para darte el pronóstico. Si escribís
  una ciudad, también recibe ese texto para encontrarla. Esa consulta la
  hace el servidor del sitio, así que Open-Meteo no ve tu IP.
- **[BigDataCloud](https://www.bigdatacloud.com/)** recibe las
  coordenadas para mostrarte el nombre del lugar. Esa consulta sale de
  tu navegador (es como lo piden sus términos), así que BigDataCloud sí
  ve tu IP. Solo pasa si compartís tu ubicación.

**¿De dónde sale el clima?**
De [Open-Meteo](https://open-meteo.com/), una fuente pública y gratuita
de pronóstico meteorológico.

**¿Es gratis?**
Sí, y no tiene publicidad ni ningún costo oculto.

## Para desarrolladores

Requisitos: [Node.js](https://nodejs.org/) 20+. No hace falta ninguna
API key ni cuenta.

```bash
git clone https://github.com/malenitaa/cuelgolaropa.git
cd cuelgolaropa
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## ¿Te sirvió?

Si te resultó útil y querés bancar el proyecto:

- [Cafecito](https://cafecito.app/rezamalena)
- [Ko-fi](https://ko-fi.com/malenitaa)

## Licencia

MIT — ver [LICENSE](LICENSE).
