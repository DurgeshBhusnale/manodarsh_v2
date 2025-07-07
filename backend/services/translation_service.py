from googletrans import Translator

def translate_to_hindi(text: str) -> str:
    """Translate English text to Hindi using googletrans."""
    translator = Translator()
    result = translator.translate(text, src='en', dest='hi')
    return result.text
