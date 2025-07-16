from googletrans import Translator
import asyncio
import logging

logger = logging.getLogger(__name__)

def translate_to_hindi(text: str) -> str:
    """Translate English text to Hindi using googletrans."""
    try:
        translator = Translator()
        result = translator.translate(text, src='en', dest='hi')
        
        # Handle both sync and async results
        if asyncio.iscoroutine(result):
            # If it's a coroutine, run it in event loop
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            try:
                actual_result = loop.run_until_complete(result)
                translated_text = actual_result.text
            except Exception as e:
                logger.error(f"Async translation failed: {e}")
                return text
        else:
            # If it's synchronous, use directly
            translated_text = result.text
        
        logger.info(f"Translated '{text}' to '{translated_text}'")
        return translated_text
    except Exception as e:
        logger.error(f"Translation failed for '{text}': {e}")
        # Fallback to original text if translation fails
        return text

def translate_to_english(text: str) -> str:
    """Translate Hindi text to English using googletrans."""
    try:
        translator = Translator()
        result = translator.translate(text, src='hi', dest='en')
        
        # Handle both sync and async results
        if asyncio.iscoroutine(result):
            # If it's a coroutine, run it in event loop
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            try:
                actual_result = loop.run_until_complete(result)
                translated_text = actual_result.text
            except Exception as e:
                logger.error(f"Async translation failed: {e}")
                return text
        else:
            # If it's synchronous, use directly
            translated_text = result.text
        
        logger.info(f"Translated '{text}' to '{translated_text}'")
        return translated_text
    except Exception as e:
        logger.error(f"Translation failed for '{text}': {e}")
        # Fallback to original text if translation fails
        return text
